import React, { useState } from 'react';
import { Group, Schedule, User } from '../types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function CalendarPanel({ groups, schedules, refresh, user }: { groups: Group[], schedules: Schedule[], refresh: () => void, user: User }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [groupId, setGroupId] = useState('');
  const [time, setTime] = useState('16:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const displayedGroups = user.role === 'Super Administrator' ? groups : groups.filter(g => g.ustadz === user.ustadzName);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getSchedulesForDate = (dateStr: string) => {
    return schedules.filter(s => s.date === dateStr && (user.role === 'Super Administrator' || groups.find(g => g.id === s.groupId)?.ustadz === user.ustadzName));
  };

  const openAddModal = (d: number) => {
    const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    setSelectedDate(dStr);
    setGroupId('');
    setTime('16:00');
    setTitle('');
    setDescription('');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Schedule) => {
    setSelectedDate(s.date);
    setGroupId(s.groupId);
    setTime(s.time);
    setTitle(s.title);
    setDescription(s.description);
    setEditingId(s.id);
    setIsModalOpen(true);
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !selectedDate || !title) return alert('Mohon lengkapi form');
    
    const url = editingId ? `/api/schedules/${editingId}` : '/api/schedules';
    const method = editingId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId,
        date: selectedDate,
        time,
        title,
        description
      })
    });
    
    setIsModalOpen(false);
    refresh();
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Kalender Kajian</h2>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
          <span className="font-bold text-slate-800 text-lg w-40 text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS.map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-0">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {blanks.map(b => (
            <div key={`blank-${b}`} className="border-r border-b border-slate-100 bg-slate-50/50 min-h-[120px]"></div>
          ))}
          {days.map(d => {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const daySchedules = getSchedulesForDate(dateStr);
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

            return (
              <div key={d} className={`border-r border-b border-slate-100 min-h-[120px] p-2 relative group transition ${isToday ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}>{d}</span>
                  <button onClick={() => openAddModal(d)} className="opacity-0 group-hover:opacity-100 p-1 text-emerald-600 hover:bg-emerald-100 rounded transition" title="Tambah Jadwal">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1 mt-2">
                  {daySchedules.map(s => {
                    const group = groups.find(g => g.id === s.groupId);
                    return (
                      <div key={s.id} onClick={() => openEditModal(s)} className="text-[10px] p-1.5 bg-emerald-100 text-emerald-800 rounded cursor-pointer hover:bg-emerald-200 transition border border-emerald-200 truncate" title={`${s.time} - ${s.title}`}>
                        <span className="font-bold">{s.time}</span> Ustadz {group?.ustadz}: {s.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
            </div>
            <form onSubmit={saveSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Tanggal</label>
                <input type="date" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu</label>
                  <input type="time" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={time} onChange={e => setTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kelompok</label>
                  <select required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={groupId} onChange={e => setGroupId(e.target.value)}>
                    <option value="">Pilih</option>
                    {displayedGroups.map(g => (
                      <option key={g.id} value={g.id}>Ustadz {g.ustadz}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Judul Kajian</label>
                <input type="text" required placeholder="e.g. Pembahasan Kitab..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Deskripsi Singkat</label>
                <textarea rows={2} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
