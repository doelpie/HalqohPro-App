import React, { useState } from 'react';
import { Kontakan, User, Group } from '../types';
import { Search, Plus, Edit2, Trash2, UserCheck, AlertCircle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

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
  const [formError, setFormError] = useState('');

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
  const [status, setStatus] = useState<Kontakan['status']>('S0');

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
      title: 'Konfirmasi Ubah Status ke Pelajar',
      message: `Apakah Anda yakin ingin mengubah status kontakan "${k.name}" menjadi Pelajar? Data santri ini akan dipindahkan dan ditampilkan di menu Daftar Pelajar.`,
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
    setStatus('S0');
    setFormError('');
  };

  const startEdit = (k: Kontakan) => {
    setName(k.name);
    setOrigin(k.origin || '');
    setAddress(k.address || '');
    setPhone(k.phone || '');
    setStatus(k.status || 'S0');
    setFormError('');
    setIsEditing(k);
    setIsAdding(true);
  };

  const filteredKontakan = kontakan.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Kontakan</h2>
          <p className="text-slate-500">Kelola data kontakan / santri halaqoh</p>
        </div>
        <button
          id="btn-add-kontakan"
          onClick={() => {
            resetForm();
            setIsEditing(null);
            setIsAdding(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Kontakan
        </button>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status Kontakan</label>
              <select
                id="select-kontakan-status"
                value={status}
                onChange={e => setStatus(e.target.value as Kontakan['status'])}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              >
                <option value="S0">S0</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
                <option value="Pelajar">Pelajar</option>
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
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-kontakan"
              type="text"
              placeholder="Cari kontakan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            />
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
                filteredKontakan.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{k.name}</td>
                    <td className="px-6 py-4">{k.origin || '-'}</td>
                    <td className="px-6 py-4">{k.address || '-'}</td>
                    <td className="px-6 py-4">{k.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                        {k.status || 'S0'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit(k) && k.status !== 'Pelajar' && (
                          <button
                            id={`btn-move-pelajar-${k.id}`}
                            onClick={() => promptMoveToPelajar(k)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Ubah Status ke Pelajar"
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
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data kontakan ditemukan.
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
    </div>
  );
}
