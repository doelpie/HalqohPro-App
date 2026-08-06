import React, { useState } from 'react';
import { Ustadz, User } from '../types';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

interface UstadzPanelProps {
  ustadzList: Ustadz[];
  user: User;
  refresh: () => void;
}

export default function UstadzPanel({ ustadzList, user, refresh }: UstadzPanelProps) {
  const [isEditing, setIsEditing] = useState<Ustadz | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');

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
    if (!name.trim()) return alert('Nama Ustadz wajib diisi');

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

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus ustadz ini?')) return;
    await fetch(`/api/ustadz/${id}`, { method: 'DELETE' });
    refresh();
  };

  const resetForm = () => {
    setName('');
    setOrigin('');
    setAddress('');
    setPhone('');
  };

  const startEdit = (u: Ustadz) => {
    setName(u.name);
    setOrigin(u.origin || '');
    setAddress(u.address || '');
    setPhone(u.phone || '');
    setIsEditing(u);
    setIsAdding(true);
  };

  const filteredUstadz = ustadzList.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Ustadz</h2>
          <p className="text-slate-500">Kelola data pembina halaqoh</p>
        </div>
        {user.role === 'Super Administrator' && (
          <button
            onClick={() => {
              resetForm();
              setIsEditing(null);
              setIsAdding(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Ustadz
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-800">{isEditing ? 'Edit Ustadz' : 'Tambah Ustadz Baru'}</h3>
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
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ustadz..."
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
                            onClick={() => handleDelete(u.id)}
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
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data ustadz ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
