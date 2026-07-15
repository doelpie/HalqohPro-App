import React, { useState } from 'react';
import { Material, User } from '../types';

export default function MaterialsPanel({ materials, refresh, user }: { materials: Material[], refresh: () => void, user: User }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slideLink, setSlideLink] = useState('');
  const [videoLink, setVideoLink] = useState('');

  const [newTitle, setNewTitle] = useState('');
  
  const addMaterial = async () => {
    if (!newTitle) return;
    const meeting = materials.length > 0 ? Math.max(...materials.map(m => m.meeting)) + 1 : 1;
    await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting, title: newTitle, slideLink: '', videoLink: '' })
    });
    setNewTitle('');
    refresh();
  };

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setTitle(m.title);
    setSlideLink(m.slideLink);
    setVideoLink(m.videoLink);
  };

  const saveEdit = async (m: Material) => {
    const updated = { ...m, title, slideLink, videoLink };
    await fetch(`/api/materials/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    setEditingId(null);
    refresh();
  };

  const isSuperAdmin = user.role === 'Super Administrator';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Kurikulum Materi</h2>
      </div>

      {isSuperAdmin && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col mb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Materi</h3>
          <div className="grid gap-4 md:grid-cols-2 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Judul Materi</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Peraturan Hidup Dalam Islam"
              />
            </div>
            <button 
              onClick={addMaterial}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors w-fit h-fit"
            >
              Tambahkan Materi
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">Pertemuan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Judul Materi</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Link Slide (G-Drive)</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Link Video (G-Drive)</th>
                {isSuperAdmin && <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {materials.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold font-mono">
                      {m.meeting.toString().padStart(2, '0')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">
                    {editingId === m.id ? (
                      <input type="text" className="w-full px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-normal" value={title} onChange={e => setTitle(e.target.value)} />
                    ) : (
                      m.title
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {editingId === m.id ? (
                      <input type="text" className="w-full px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" value={slideLink} onChange={e => setSlideLink(e.target.value)} />
                    ) : (
                      m.slideLink ? <a href={m.slideLink} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">View Slide</a> : '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {editingId === m.id ? (
                      <input type="text" className="w-full px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" value={videoLink} onChange={e => setVideoLink(e.target.value)} />
                    ) : (
                      m.videoLink ? <a href={m.videoLink} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">View Video</a> : '-'
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingId === m.id ? (
                        <button onClick={() => saveEdit(m)} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition">Simpan</button>
                      ) : (
                        <button onClick={() => startEdit(m)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200 transition opacity-0 group-hover:opacity-100">Edit</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
