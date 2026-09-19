import React, { useState } from 'react';
import { User } from '../types';
import { X, Key } from 'lucide-react';

export default function ChangePasswordModal({ user, onClose }: { user: User, onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Password berhasil diubah!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.error || 'Gagal mengubah password');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            Ganti Password
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-lg text-center">{success}</div>}
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Password Saat Ini</label>
            <input 
              type="password" 
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none text-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Password Baru</label>
            <input 
              type="password" 
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none text-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Konfirmasi Password Baru</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none text-sm" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
