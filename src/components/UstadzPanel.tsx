import React, { useState, useRef, useMemo } from 'react';
import { Ustadz, User } from '../types';
import { Search, Plus, Edit2, Trash2, AlertCircle, Download, Upload, FileText, Filter, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { downloadCSV, parseCSV } from '../utils/csv';

interface UstadzPanelProps {
  ustadzList: Ustadz[];
  user: User;
  refresh: () => void;
}

export default function UstadzPanel({ ustadzList, user, refresh }: UstadzPanelProps) {
  const [isEditing, setIsEditing] = useState<Ustadz | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('ALL');
  const [formError, setFormError] = useState('');

  // CSV states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Confirmation Modal state
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

  const canEdit = (u: Ustadz) => {
    if (user.role === 'Super Administrator') return true;
    if (u.name === user.ustadzName) return true;
    return false;
  };

  const canDelete = () => user.role === 'Super Administrator';

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Nama Ustadz wajib diisi.');
      return;
    }
    setFormError('');

    const payload = {
      name,
      origin,
      address,
      phone,
    };

    if (isEditing) {
      await fetch(`/api/ustadz/${isEditing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/ustadz', {
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

  const promptDelete = (u: Ustadz) => {
    setConfirmState({
      isOpen: true,
      title: 'Konfirmasi Hapus Ustadz',
      message: `Apakah Anda yakin ingin menghapus data Ustadz "${u.name}"? Tindakan ini bersifat permanen.`,
      confirmLabel: 'Ya, Hapus Data',
      cancelLabel: 'Batal',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await fetch(`/api/ustadz/${u.id}`, { method: 'DELETE' });
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

  const startEdit = (u: Ustadz) => {
    setName(u.name);
    setOrigin(u.origin || '');
    setAddress(u.address || '');
    setPhone(u.phone || '');
    setFormError('');
    setIsEditing(u);
    setIsAdding(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (ustadzList.length === 0) return alert('Tidak ada data ustadz untuk diexport');
    const headers = ['Nama Ustadz', 'Daerah Asal', 'Alamat', 'Nomor HP'];
    const rows = ustadzList.map(u => [u.name, u.origin || '', u.address || '', u.phone || '']);
    downloadCSV('Daftar_Ustadz_Pembina.csv', headers, rows);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['Nama Ustadz', 'Daerah Asal', 'Alamat', 'Nomor HP'];
    const exampleRows = [
      ['Ustadz Abdullah', 'Solo', 'Jl. Slamet Riyadi No. 10', '081298765432'],
      ['Ustadz Mansur', 'Yogyakarta', 'Jl. Kaliurang KM 5', '085612345678']
    ];
    downloadCSV('Template_Import_Ustadz.csv', headers, exampleRows);
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
        phone: r[3] || ''
      })).filter(u => u.name.trim().length > 0);

      if (parsed.length === 0) {
        alert('Tidak ditemukan nama ustadz yang valid pada file CSV');
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
        body: JSON.stringify({ entity: 'ustadz', items: csvPreview })
      });
      if (res.ok) {
        setCsvPreview(null);
        refresh();
        alert(`Berhasil mengimpor ${csvPreview.length} data ustadz!`);
      } else {
        alert('Gagal mengimpor data ke server');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsImporting(false);
    }
  };

  // Unique list of origins for quick category filter
  const availableOrigins = useMemo(() => {
    const set = new Set<string>();
    ustadzList.forEach(u => {
      if (u.origin && u.origin.trim()) set.add(u.origin.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ustadzList]);

  const filteredUstadz = useMemo(() => {
    return ustadzList.filter(u => {
      const query = search.trim().toLowerCase();
      if (query) {
        const match = 
          u.name.toLowerCase().includes(query) ||
          (u.origin && u.origin.toLowerCase().includes(query)) ||
          (u.address && u.address.toLowerCase().includes(query)) ||
          (u.phone && u.phone.includes(query));
        if (!match) return false;
      }

      if (selectedOrigin !== 'ALL') {
        if ((u.origin || '').trim() !== selectedOrigin) return false;
      }

      return true;
    });
  }, [ustadzList, search, selectedOrigin]);

  const hasActiveFilters = search.trim().length > 0 || selectedOrigin !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setSelectedOrigin('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCSVSelect}
        accept=".csv,text/csv"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Ustadz</h2>
          <p className="text-slate-500">Kelola data pembina halaqoh</p>
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

          {user.role === 'Super Administrator' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
              title="Import CSV"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Import CSV
            </button>
          )}

          {user.role === 'Super Administrator' && (
            <button
              id="btn-add-ustadz"
              onClick={() => {
                resetForm();
                setIsEditing(null);
                setIsAdding(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Ustadz
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-800">{isEditing ? 'Edit Ustadz' : 'Tambah Ustadz Baru'}</h3>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Ustadz</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Masukkan nama ustadz"
                disabled={user.role !== 'Super Administrator' && !isEditing}
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
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search input with clear button */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-ustadz"
                type="text"
                placeholder="Cari nama, asal, alamat, atau HP..."
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

            {/* Filter Daerah Asal */}
            {availableOrigins.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="filter-ustadz-origin"
                  value={selectedOrigin}
                  onChange={e => setSelectedOrigin(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Daerah Asal</option>
                  {availableOrigins.map(orig => (
                    <option key={orig} value={orig}>{orig}</option>
                  ))}
                </select>
              </div>
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
          <div className="text-xs text-slate-500 shrink-0 self-end sm:self-auto font-medium">
            Menampilkan <strong className="text-emerald-700 font-bold">{filteredUstadz.length}</strong> dari {ustadzList.length} ustadz
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama Ustadz</th>
                <th className="px-6 py-4">Daerah Asal</th>
                <th className="px-6 py-4">Alamat Tinggal</th>
                <th className="px-6 py-4">Nomor HP WA</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUstadz.length > 0 ? (
                filteredUstadz.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                    <td className="px-6 py-4">{u.origin || '-'}</td>
                    <td className="px-6 py-4">{u.address || '-'}</td>
                    <td className="px-6 py-4">{u.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit(u) && (
                          <button
                            onClick={() => startEdit(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete() && (
                          <button
                            id={`btn-delete-ustadz-${u.id}`}
                            onClick={() => promptDelete(u)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">Tidak ada data ustadz yang cocok</p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters ? 'Coba ubah kata kunci atau reset filter pencarian.' : 'Belum ada data ustadz yang terdaftar.'}
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
                  Konfirmasi Import CSV Ustadz
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{csvPreview.length} data ustadz</strong> yang siap dimasukkan ke sistem.
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
              {csvPreview.map((u, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{idx + 1}. {u.name}</span>
                    <span className="text-slate-500 text-[11px]">{u.phone || 'No HP -'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Asal: {u.origin || '-'} • Alamat: {u.address || '-'}
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
                {isImporting ? 'Mengimpor...' : `Impor ${csvPreview.length} Ustadz`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
