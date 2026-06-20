import React, { useState } from 'react';
import { Group, Material, Progress } from '../types';

export default function ProgressPanel({ groups, materials, progress, refresh }: { groups: Group[], materials: Material[], progress: Progress[], refresh: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const [date, setDate] = useState('');
  const [attendance, setAttendance] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const group = groups.find(g => g.id === selectedGroup);

  const handleToggleAttendance = (student: string) => {
    setAttendance(prev => 
      prev.includes(student) ? prev.filter(s => s !== student) : [...prev, student]
    );
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroup(e.target.value);
    setAttendance([]);
  };

  const saveProgress = async () => {
    if (!selectedGroup || !selectedMeeting || !date) return alert('Mohon lengkapi form');
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: selectedGroup,
        meeting: parseInt(selectedMeeting),
        date,
        attendance,
        notes
      })
    });
    // Add to Calendar Integration could be triggered here or separately
    try {
      const materialTitle = materials.find(m => m.meeting === parseInt(selectedMeeting))?.title;
      await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Halaqoh: ${group?.ustadz} - ${materialTitle}`,
          date,
          description: `Pertemuan ini membahas: ${materialTitle}\nKehadiran: ${attendance.join(', ')}\nCatatan: ${notes}`
        })
      });
      alert('Tersimpan & Ditambahkan ke Google Calendar (jika terhubung).');
    } catch (err) {
      alert('Tersimpan di local, tapi belum sync kalender.');
    }
    
    setSelectedGroup('');
    setSelectedMeeting('');
    setDate('');
    setAttendance([]);
    setNotes('');
    refresh();
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Laporan Presensi</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Catat Progres Pertemuan</h3>
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kelompok</label>
            <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={selectedGroup} onChange={handleGroupChange}>
              <option value="">Pilih Kelompok</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>Kelompok {g.ustadz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Materi</label>
            <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={selectedMeeting} onChange={e => setSelectedMeeting(e.target.value)}>
              <option value="">Pilih Materi</option>
              {materials.map(m => (
                <option key={m.id} value={m.meeting}>Pertemuan {m.meeting}: {m.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu Kajian</label>
            <input type="datetime-local" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {group && (
          <div className="mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Presensi (Centang yang hadir)</label>
            <div className="flex flex-wrap gap-4">
              {group.students.map(student => (
                <label key={student} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-emerald-600 rounded border-slate-300" checked={attendance.includes(student)} onChange={() => handleToggleAttendance(student)} />
                  <span className="text-sm font-medium text-slate-800">{student}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Catatan</label>
          <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tambahkan catatan singkat..."></textarea>
        </div>

        <button onClick={saveProgress} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center rounded-lg shadow-sm transition-colors text-sm w-fit mt-2">
          Simpan & Jadwalkan Kalender
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 p-5 border-b border-slate-200 uppercase tracking-wider">Riwayat Kajian</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kelompok</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pertemuan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {progress.slice().reverse().map(p => {
                const g = groups.find(x => x.id === p.groupId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-800 font-bold">Ustadz {g?.ustadz || 'Unknown'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(p.date).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 text-center">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs">Ke-{p.meeting.toString().padStart(2, '0')}</span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-emerald-600">{p.attendance.length} / {g?.students.length}</td>
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
