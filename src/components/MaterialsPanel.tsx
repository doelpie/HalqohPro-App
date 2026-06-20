import React, { useState } from 'react';
import { Material } from '../types';

export default function MaterialsPanel({ materials, refresh }: { materials: Material[], refresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slideLink, setSlideLink] = useState('');
  const [videoLink, setVideoLink] = useState('');

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setSlideLink(m.slideLink);
    setVideoLink(m.videoLink);
  };

  const saveEdit = async (m: Material) => {
    const updated = { ...m, slideLink, videoLink };
    await fetch(`/api/materials/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    setEditingId(null);
    refresh();
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Kurikulum Materi</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pertemuan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Materi</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Link Slide (G-Drive)</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Link Video (G-Drive)</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{m.title}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === m.id ? (
                      <button onClick={() => saveEdit(m)} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition">Simpan</button>
                    ) : (
                      <button onClick={() => startEdit(m)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200 transition opacity-0 group-hover:opacity-100">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
