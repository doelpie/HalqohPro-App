import React, { useState, useRef, useMemo } from 'react';
import { Student, User, Group } from '../types';
import { Search, Plus, Edit2, Trash2, AlertCircle, Download, Upload, FileText, Filter, X, Users } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { downloadCSV, parseCSV } from '../utils/csv';

interface StudentsPanelProps {
  students: Student[];
  groups: Group[];
  user: User;
  refresh: () => void;
}

export default function StudentsPanel({ students, groups, user, refresh }: StudentsPanelProps) {
  const [isEditing, setIsEditing] = useState<Student | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedOrigin, setSelectedOrigin] = useState('ALL');
  const [formError, setFormError] = useState('');

  // CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => Promise<void> | void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Ya, Hapus Data',
    cancelLabel: 'Batal',
    variant: 'danger',
    onConfirm: () => {},
    isLoading: false,
  });

  // Form states
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const canEdit = (student: Student) => {
    if (user.role === 'Super Administrator') return true;
    if (student.createdBy === user.ustadzName) return true;
    
    // Check if student is in a group managed by this Ustadz
    const managedGroups = groups.filter(g => g.ustadz === user.ustadzName);
    const inManagedGroup = managedGroups.some(g => g.students.includes(student.name));
    if (inManagedGroup) return true;

    return false;
  };

  const canDelete = () => user.role === 'Super Administrator';

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Nama pelajar wajib diisi.');
      return;
    }
    setFormError('');

    const payload = {
      name,
      origin,
      address,
      phone,
      createdBy: isEditing ? isEditing.createdBy : user.ustadzName,
    };

    if (isEditing) {
      await fetch(`/api/students/${isEditing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    setIsAdding(false);
    setIsEditing(null);
    resetForm();
    refresh();
  };

  const promptDelete = (student: Student) => {
    setConfirmState({
      isOpen: true,
      title: 'Konfirmasi Hapus Pelajar',
      message: `Apakah Anda yakin ingin menghapus data pelajar "${student.name}"? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus Data',
      cancelLabel: 'Batal',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
          refresh();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const resetForm = () => {
    setName('');
    setOrigin('');
    setAddress('');
    setPhone('');
    setFormError('');
  };

  const startEdit = (student: Student) => {
    setName(student.name);
    setOrigin(student.origin || '');
    setAddress(student.address || '');
    setPhone(student.phone || '');
    setFormError('');
    setIsEditing(student);
    setIsAdding(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (students.length === 0) return alert('Tidak ada data pelajar untuk diexport');
    const headers = ['Nama Pelajar', 'Daerah Asal', 'Alamat Tinggal', 'Nomor HP', 'Dicatat Oleh'];
    const rows = students.map(s => [s.name, s.origin || '', s.address || '', s.phone || '', s.createdBy || '']);
    downloadCSV('Daftar_Pelajar_Daris.csv', headers, rows);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['Nama Pelajar', 'Daerah Asal', 'Alamat Tinggal', 'Nomor HP'];
    const exampleRows = [
      ['Muhammad Fatih', 'Surabaya', 'Jl. Kenanga No. 12', '081234567890'],
      ['Ahmad Zaki', 'Denpasar', 'Jl. Teuku Umar No. 45', '085712345678'],
      ['Faris Al-Baqir', 'Malang', 'Komplek Pondok Indah', '082198765432']
    ];
    downloadCSV('Template_Import_Pelajar.csv', headers, exampleRows);
  };

  // CSV Import
  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { rows } = parseCSV(text);
      if (rows.length === 0) {
        alert('File CSV kosong atau tidak memiliki data.');
        return;
      }
      const parsed = rows.map(r => ({
        name: r[0] || '',
        origin: r[1] || '',
        address: r[2] || '',
        phone: r[3] || '',
        createdBy: user.ustadzName || user.username
      })).filter(s => s.name.trim().length > 0);

      if (parsed.length === 0) {
        alert('Tidak ditemukan data nama pelajar yang valid pada file CSV');
        return;
      }
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmCSVImport = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'students', items: csvPreview })
      });
      if (res.ok) {
        setCsvPreview(null);
        refresh();
        alert(`Berhasil mengimpor ${csvPreview.length} data pelajar!`);
      } else {
        alert('Gagal mengimpor data ke server');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsImporting(false);
    }
  };

  // Map student name to group for fast lookup
  const studentGroupMap = useMemo(() => {
    const map = new Map<string, Group>();
    groups.forEach(g => {
      (g.students || []).forEach(stName => {
        if (!map.has(stName)) map.set(stName, g);
      });
    });
    return map;
  }, [groups]);

  // Unique list of origins for quick category filter
  const availableOrigins = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.origin && s.origin.trim()) set.add(s.origin.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  // Filtered students based on search query and category filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Text Search across multiple fields
      const query = search.trim().toLowerCase();
      if (query) {
        const studentGrp = studentGroupMap.get(s.name);
        const grpName = studentGrp ? `kelompok ustadz ${studentGrp.ustadz}`.toLowerCase() : '';
        const matchText = 
          s.name.toLowerCase().includes(query) ||
          (s.origin && s.origin.toLowerCase().includes(query)) ||
          (s.address && s.address.toLowerCase().includes(query)) ||
          (s.phone && s.phone.includes(query)) ||
          (s.createdBy && s.createdBy.toLowerCase().includes(query)) ||
          grpName.includes(query);
        if (!matchText) return false;
      }

      // 2. Group / Category filter
      if (selectedCategory !== 'ALL') {
        const studentGrp = studentGroupMap.get(s.name);
        if (selectedCategory === 'UNASSIGNED') {
          if (studentGrp) return false;
        } else {
          if (!studentGrp || studentGrp.id !== selectedCategory) return false;
        }
      }

      // 3. Origin filter
      if (selectedOrigin !== 'ALL') {
        if ((s.origin || '').trim() !== selectedOrigin) return false;
      }

      return true;
    });
  }, [students, search, selectedCategory, selectedOrigin, studentGroupMap]);

  const hasActiveFilters = search.trim().length > 0 || selectedCategory !== 'ALL' || selectedOrigin !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedOrigin('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Hidden CSV file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCSVSelect}
        accept=".csv,text/csv"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Pelajar (Daris)</h2>
          <p className="text-slate-500">Kelola data pelajar / daris halaqoh</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Download Template CSV"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Template CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Import CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import CSV
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsEditing(null);
              setIsAdding(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Pelajar
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-800">{isEditing ? 'Edit Pelajar' : 'Tambah Pelajar Baru'}</h3>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Pelajar</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Masukkan nama pelajar"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor HP WA</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Contoh: 08123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Daerah Asal</label>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Contoh: Jakarta"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Tinggal</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Alamat saat ini"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Simpan
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setIsEditing(null);
                resetForm();
              }}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input with quick clear */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-students"
                type="text"
                placeholder="Cari nama, asal, alamat, HP, kelompok..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Kategori Kelompok */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-student-group"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Kelompok ({students.length})</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    Kelompok {g.ustadz} ({g.students?.length || 0})
                  </option>
                ))}
                <option value="UNASSIGNED">Belum Masuk Kelompok</option>
              </select>
            </div>

            {/* Filter Daerah Asal */}
            {availableOrigins.length > 0 && (
              <select
                id="filter-student-origin"
                value={selectedOrigin}
                onChange={e => setSelectedOrigin(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Daerah Asal</option>
                {availableOrigins.map(orig => (
                  <option key={orig} value={orig}>{orig}</option>
                ))}
              </select>
            )}

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded-lg transition"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Results Count Badge */}
          <div className="text-xs text-slate-500 shrink-0 self-end lg:self-auto font-medium">
            Menampilkan <strong className="text-emerald-700 font-bold">{filteredStudents.length}</strong> dari {students.length} pelajar
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama Pelajar</th>
                <th className="px-6 py-4">Kelompok Halaqoh</th>
                <th className="px-6 py-4">Daerah Asal</th>
                <th className="px-6 py-4">Alamat Tinggal</th>
                <th className="px-6 py-4">Nomor HP WA</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  const studentGrp = studentGroupMap.get(student.name);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                      <td className="px-6 py-4">
                        {studentGrp ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Users className="w-3 h-3 text-emerald-600" />
                            {studentGrp.ustadz}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-slate-400 bg-slate-100">
                            Belum Ada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{student.origin || '-'}</td>
                      <td className="px-6 py-4">{student.address || '-'}</td>
                      <td className="px-6 py-4">{student.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canEdit(student) && (
                              <button
                                onClick={() => startEdit(student)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                          )}
                          {canDelete() && (
                            <button
                              id={`btn-delete-student-${student.id}`}
                              onClick={() => promptDelete(student)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">Tidak ada data pelajar yang cocok</p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters ? 'Coba ubah kata kunci atau reset filter pencarian.' : 'Belum ada data pelajar yang terdaftar.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="mt-2 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        isLoading={confirmState.isLoading}
        onConfirm={confirmState.onConfirm}
        onCancel={() => {
          if (!confirmState.isLoading) {
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
        }}
      />

      {/* CSV Preview Modal */}
      {csvPreview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Import CSV Pelajar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{csvPreview.length} data pelajar</strong> yang siap dimasukkan ke sistem.
                </p>
              </div>
              <button 
                onClick={() => setCsvPreview(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {csvPreview.map((s, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{idx + 1}. {s.name}</span>
                    <span className="text-slate-500 text-[11px]">{s.phone || 'No HP -'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Asal: {s.origin || '-'} • Alamat: {s.address || '-'}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={confirmCSVImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isImporting ? 'Mengimpor...' : `Impor ${csvPreview.length} Pelajar`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
