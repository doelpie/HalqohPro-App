import React, { useState } from 'react';
import { KontakProgress, Kontakan, User } from '../types';

export default function KontakProgressPanel({
  kontakProgress,
  kontakan,
  refresh,
  user
}: {
  kontakProgress: KontakProgress[];
  kontakan: Kontakan[];
  refresh: () => void;
  user: User;
}) {
  const [selectedKontakan, setSelectedKontakan] = useState('');
  const [date, setDate] = useState('');
  const [pembahasan, setPembahasan] = useState('');
  const [notes, setNotes] = useState('');

  const displayedKontakan = kontakan.filter(
    k => user.role === 'Super Administrator' || k.createdBy === user.ustadzName
  );

  const displayedProgress = kontakProgress.filter(p =>
    user.role === 'Super Administrator' || p.createdBy === user.ustadzName
  );

  const saveProgress = async () => {
    if (!selectedKontakan || !date || !pembahasan) return alert('Mohon isi kontakan, tanggal, dan pembahasan');

    await fetch('/api/kontakProgress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kontakanId: selectedKontakan,
        date,
        pembahasan,
        notes,
        createdBy: user.ustadzName
      })
    });

    const k = kontakan.find(x => x.id === selectedKontakan);
    try {
      await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Kontak: ${k?.name} - ${pembahasan}`,
          date,
          description: `Kontak dengan: ${k?.name}\nPembahasan: ${pembahasan}\nCatatan: ${notes}`
        })
      });
      alert('Tersimpan & Ditambahkan ke Google Calendar (jika terhubung).');
    } catch (err) {
      alert('Tersimpan di local, tapi belum sync kalender.');
    }

    setSelectedKontakan('');
    setDate('');
    setPembahasan('');
    setNotes('');
    refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Progres Kontak</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Catat Progres Kontak</h3>
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kontakan</label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={selectedKontakan}
              onChange={e => setSelectedKontakan(e.target.value)}
            >
              <option value="">Pilih Kontakan</option>
              {displayedKontakan.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu Kontak</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Pembahasan</label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
            value={pembahasan}
            onChange={e => setPembahasan(e.target.value)}
            placeholder="Topik pembahasan..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Catatan Tambahan</label>
          <textarea
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Catatan hasil diskusi..."
          ></textarea>
        </div>
        
        <button
          onClick={saveProgress}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center rounded-lg shadow-sm transition-colors text-sm w-fit mt-2"
        >
          Simpan & Jadwalkan Kalender
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 p-5 border-b border-slate-200 uppercase tracking-wider">Riwayat Kontak</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kontakan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pembahasan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ustadz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedProgress.slice().reverse().map(p => {
                const k = kontakan.find(x => x.id === p.kontakanId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-800 font-bold">{k?.name || 'Unknown'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(p.date).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{p.pembahasan}</td>
                    <td className="px-6 py-3 text-sm font-medium text-emerald-600">{p.createdBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
