import React, { useState, useRef, useMemo } from 'react';
import { Kontakan, User, Group, KontakanStatus, KONTAKAN_STATUS_LABELS } from '../types';
import { Search, Plus, Edit2, Trash2, UserCheck, AlertCircle, Download, Upload, FileText, Filter, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { downloadCSV, parseCSV } from '../utils/csv';

interface KontakansPanelProps {
  kontakan: Kontakan[];
  groups?: Group[];
  user: User;
  refresh: () => void;
}

export default function KontakansPanel({ kontakan, groups = [], user, refresh }: KontakansPanelProps) {
  const [isEditing, setIsEditing] = useState<Kontakan | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
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
    confirmLabel: 'Ya, Lanjutkan',
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
  const [status, setStatus] = useState<KontakanStatus>('CKA');

  const canEdit = (k: Kontakan) => {
    if (user.role === 'Super Administrator') return true;
    if (k.createdBy === user.ustadzName) return true;
    
    // Check if student is in a group managed by this Ustadz
    const managedGroups = groups.filter(g => g.ustadz === user.ustadzName);
    const inManagedGroup = managedGroups.some(g => g.students.includes(k.name));
    if (inManagedGroup) return true;

    return false;
  };

  const canDelete = () => user.role === 'Super Administrator';

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Nama kontakan wajib diisi.');
      return;
    }
    setFormError('');

    const payload = {
      name,
      origin,
      address,
      phone,
      status,
      createdBy: isEditing ? isEditing.createdBy : user.ustadzName,
    };

    if (isEditing) {
      await fetch(`/api/kontakan/${isEditing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/kontakan', {
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

  const promptMoveToPelajar = (k: Kontakan) => {
    setConfirmState({
      isOpen: true,
      title: 'Konfirmasi Ubah Status ke Pelajar (Daris)',
      message: `Apakah Anda yakin ingin mengubah status kontakan "${k.name}" menjadi Pelajar (Daris)? Data daris ini akan dipindahkan dan ditampilkan di menu Daftar Pelajar.`,
      confirmLabel: 'Ya, Ubah ke Pelajar',
      cancelLabel: 'Batal',
      variant: 'success',
      isLoading: false,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await fetch(`/api/kontakan/${k.id}/move-to-pelajar`, { method: 'POST' });
          refresh();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const promptDelete = (k: Kontakan) => {
    setConfirmState({
      isOpen: true,
      title: 'Konfirmasi Hapus Kontakan',
      message: `Apakah Anda yakin ingin menghapus data kontakan "${k.name}"? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus Data',
      cancelLabel: 'Batal',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await fetch(`/api/kontakan/${k.id}`, { method: 'DELETE' });
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
    setStatus('CKA');
    setFormError('');
  };

  const startEdit = (k: Kontakan) => {
    setName(k.name);
    setOrigin(k.origin || '');
    setAddress(k.address || '');
    setPhone(k.phone || '');
    setStatus(k.status || 'CKA');
    setFormError('');
    setIsEditing(k);
    setIsAdding(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (kontakan.length === 0) return alert('Tidak ada data kontakan untuk diexport');
    const headers = ['Nama Kontakan', 'Daerah Asal', 'Alamat', 'Nomor HP', 'Status', 'Dicatat Oleh'];
    const rows = kontakan.map(k => [k.name, k.origin || '', k.address || '', k.phone || '', k.status || 'CKA', k.createdBy || '']);
    downloadCSV('Daftar_Kontakan.csv', headers, rows);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['Nama Kontakan', 'Daerah Asal', 'Alamat', 'Nomor HP', 'Status (CKA/S0/S1/S2/S3/S4/PD/DIK/Pelajar)'];
    const exampleRows = [
      ['Rian Saputra', 'Semarang', 'Jl. Diponegoro 15', '081324567890', 'CKA'],
      ['Hendra Kurniawan', 'Bandung', 'Jl. Dago Atas', '087812345678', 'S1']
    ];
    downloadCSV('Template_Import_Kontakan.csv', headers, exampleRows);
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
      const validStatuses = ['CKA', 'S0', 'S1', 'S2', 'S3', 'S4', 'PD', 'DIK', 'Pelajar'];
      const parsed = rows.map(r => ({
        name: r[0] || '',
        origin: r[1] || '',
        address: r[2] || '',
        phone: r[3] || '',
        status: (validStatuses.includes(r[4]) ? r[4] : 'CKA') as KontakanStatus,
        createdBy: user.ustadzName || user.username
      })).filter(k => k.name.trim().length > 0);

      if (parsed.length === 0) {
        alert('Tidak ditemukan nama kontakan yang valid pada file CSV');
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
        body: JSON.stringify({ entity: 'kontakan', items: csvPreview })
      });
      if (res.ok) {
        setCsvPreview(null);
        refresh();
        alert(`Berhasil mengimpor ${csvPreview.length} data kontakan!`);
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
    kontakan.forEach(k => {
      if (k.origin && k.origin.trim()) set.add(k.origin.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [kontakan]);

  // Counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      CKA: 0,
      S0: 0,
      S1: 0,
      S2: 0,
      S3: 0,
      S4: 0,
      PD: 0,
      DIK: 0,
      Pelajar: 0,
    };
    kontakan.forEach(k => {
      const st = k.status || 'CKA';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [kontakan]);

  const filteredKontakan = useMemo(() => {
    return kontakan.filter(k => {
      // 1. Multi-field search
      const query = search.trim().toLowerCase();
      if (query) {
        const statusLabel = (KONTAKAN_STATUS_LABELS[k.status as KontakanStatus] || k.status || '').toLowerCase();
        const match = 
          k.name.toLowerCase().includes(query) ||
          (k.origin && k.origin.toLowerCase().includes(query)) ||
          (k.address && k.address.toLowerCase().includes(query)) ||
          (k.phone && k.phone.includes(query)) ||
          (k.createdBy && k.createdBy.toLowerCase().includes(query)) ||
          (k.status && k.status.toLowerCase().includes(query)) ||
          statusLabel.includes(query);
        if (!match) return false;
      }

      // 2. Status / Category filter
      if (selectedStatus !== 'ALL') {
        const st = k.status || 'CKA';
        if (st !== selectedStatus) return false;
      }

      // 3. Origin filter
      if (selectedOrigin !== 'ALL') {
        if ((k.origin || '').trim() !== selectedOrigin) return false;
      }

      return true;
    });
  }, [kontakan, search, selectedStatus, selectedOrigin]);

  const hasActiveFilters = search.trim().length > 0 || selectedStatus !== 'ALL' || selectedOrigin !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setSelectedStatus('ALL');
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
          <h2 className="text-2xl font-bold text-slate-800">Daftar Kontakan</h2>
          <p className="text-slate-500">Kelola data kontakan / daris halaqoh</p>
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
            id="btn-add-kontakan"
            onClick={() => {
              resetForm();
              setIsEditing(null);
              setIsAdding(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Kontakan
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-800">{isEditing ? 'Edit Kontakan' : 'Tambah Kontakan Baru'}</h3>
          
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kontakan</label>
              <input
                id="input-kontakan-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Masukkan nama kontakan"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor HP WA</label>
              <input
                id="input-kontakan-phone"
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                placeholder="Contoh: 08123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status Tahapan (Pipeline)</label>
              <select
                id="select-kontakan-status"
                value={status}
                onChange={e => setStatus(e.target.value as KontakanStatus)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm"
              >
                <option value="CKA">CKA - Calon Kontakan Awal</option>
                <option value="S0">S0 - Sudah ditemui dan proses profiling</option>
                <option value="S1">S1 - Sepakat Kondisi Saat Ini Rusak</option>
                <option value="S2">S2 - Sepakat Sistemnya Yang Rusak bukan Rezim/ Orangnya</option>
                <option value="S3">S3 - Sepakat Solusi Islam</option>
                <option value="S4">S4 - Sepakat Solusi Islam Kaffah</option>
                <option value="PD">PD - Pra Dauroh</option>
                <option value="DIK">DIK - Dauroh Islam Kaffah</option>
                <option value="Pelajar">Pelajar (Daris)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Daerah Asal</label>
              <input
                id="input-kontakan-origin"
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
                id="input-kontakan-address"
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
              id="btn-save-kontakan"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Simpan
            </button>
            <button
              id="btn-cancel-kontakan"
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
                id="search-kontakan"
                type="text"
                placeholder="Cari nama, asal, alamat, HP, status..."
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

            {/* Filter Kategori Status Tahapan (Pipeline) */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-kontakan-status"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[260px]"
              >
                <option value="ALL">Semua Status ({kontakan.length})</option>
                <option value="CKA">CKA - Calon Kontakan Awal ({statusCounts.CKA || 0})</option>
                <option value="S0">S0 - Sudah ditemui & profiling ({statusCounts.S0 || 0})</option>
                <option value="S1">S1 - Sepakat Kondisi Saat Ini Rusak ({statusCounts.S1 || 0})</option>
                <option value="S2">S2 - Sepakat Sistemnya Yang Rusak ({statusCounts.S2 || 0})</option>
                <option value="S3">S3 - Sepakat Solusi Islam ({statusCounts.S3 || 0})</option>
                <option value="S4">S4 - Sepakat Solusi Islam Kaffah ({statusCounts.S4 || 0})</option>
                <option value="PD">PD - Pra Dauroh ({statusCounts.PD || 0})</option>
                <option value="DIK">DIK - Dauroh Islam Kaffah ({statusCounts.DIK || 0})</option>
                <option value="Pelajar">Pelajar (Daris) ({statusCounts.Pelajar || 0})</option>
              </select>
            </div>

            {/* Filter Daerah Asal */}
            {availableOrigins.length > 0 && (
              <select
                id="filter-kontakan-origin"
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
            Menampilkan <strong className="text-emerald-700 font-bold">{filteredKontakan.length}</strong> dari {kontakan.length} calon daris
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama Kontakan</th>
                <th className="px-6 py-4">Daerah Asal</th>
                <th className="px-6 py-4">Alamat Tinggal</th>
                <th className="px-6 py-4">Nomor HP WA</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKontakan.length > 0 ? (
                filteredKontakan.map(k => {
                  const getStatusBadgeClass = (st: string) => {
                    switch (st) {
                      case 'Pelajar': return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      case 'DIK': return 'bg-teal-100 text-teal-800 border-teal-300 font-bold';
                      case 'PD': return 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold';
                      case 'S4': return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                      case 'S3': return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
                      case 'S2': return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                      case 'S1': return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
                      case 'S0': return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
                      case 'CKA': return 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
                      default: return 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
                    }
                  };

                  const statusTitle = KONTAKAN_STATUS_LABELS[k.status as KontakanStatus] || k.status || 'CKA';
                  const displayBadge = k.status === 'Pelajar' ? 'Pelajar (Daris)' : (k.status || 'CKA');

                  return (
                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{k.name}</td>
                      <td className="px-6 py-4">{k.origin || '-'}</td>
                      <td className="px-6 py-4">{k.address || '-'}</td>
                      <td className="px-6 py-4">{k.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <span 
                          title={statusTitle}
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs border cursor-help ${getStatusBadgeClass(k.status || 'CKA')}`}
                        >
                          {displayBadge}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canEdit(k) && k.status !== 'Pelajar' && (
                            <button
                              id={`btn-move-pelajar-${k.id}`}
                              onClick={() => promptMoveToPelajar(k)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Ubah Status ke Pelajar (Daris)"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit(k) && (
                              <button
                                id={`btn-edit-kontakan-${k.id}`}
                                onClick={() => startEdit(k)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                          )}
                          {canDelete() && (
                            <button
                              id={`btn-delete-kontakan-${k.id}`}
                              onClick={() => promptDelete(k)}
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
                      <p className="font-semibold text-slate-700 text-sm">Tidak ada data kontakan yang cocok</p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters ? 'Coba ubah kata kunci atau reset filter pencarian.' : 'Belum ada data calon daris yang terdaftar.'}
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
                  Konfirmasi Import CSV Kontakan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{csvPreview.length} data kontakan</strong> yang siap dimasukkan ke sistem.
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
              {csvPreview.map((k, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{idx + 1}. {k.name}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 font-bold text-[10px] rounded">{k.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Asal: {k.origin || '-'} • HP: {k.phone || '-'}
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
                {isImporting ? 'Mengimpor...' : `Impor ${csvPreview.length} Kontakan`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
