import React, { useState, useRef } from 'react';
import { Kontakan, KontakSchedule, Material, User } from '../types';
import { ChevronLeft, ChevronRight, Plus, Download, Upload, Calendar as CalendarIcon, BookOpen } from 'lucide-react';
import { downloadICS, parseICS, ICSEvent } from '../utils/icalendar';

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function KontakCalendarPanel({
  kontakan,
  kontakSchedules,
  materials = [],
  refresh,
  user
}: {
  kontakan: Kontakan[];
  kontakSchedules: KontakSchedule[];
  materials?: Material[];
  refresh: () => void;
  user: User;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [kontakanId, setKontakanId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [time, setTime] = useState('16:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // ICS State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [icsPreview, setIcsPreview] = useState<ICSEvent[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const displayedKontakans = user.role === 'Super Administrator' ? kontakan : kontakan.filter(g => g.createdBy === user.ustadzName);
  
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

  const getKontakSchedulesForDate = (dateStr: string) => {
    return kontakSchedules.filter(s => s.date === dateStr && (user.role === 'Super Administrator' || kontakan.find(g => g.id === s.kontakanId)?.createdBy === user.ustadzName));
  };

  const openAddModal = (d: number) => {
    const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    setSelectedDate(dStr);
    setKontakanId('');
    setMaterialId('');
    setTime('16:00');
    setTitle('');
    setDescription('');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: KontakSchedule) => {
    setSelectedDate(s.date);
    setKontakanId(s.kontakanId);
    setMaterialId(s.materialId || '');
    setTime(s.time);
    setTitle(s.title);
    setDescription(s.description);
    setEditingId(s.id);
    setIsModalOpen(true);
  };

  const saveKontakSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kontakanId || !selectedDate || !title) return alert('Mohon lengkapi form');
    
    const url = editingId ? `/api/kontakSchedules/${editingId}` : '/api/kontakSchedules';
    const method = editingId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kontakanId,
        materialId: materialId || undefined,
        date: selectedDate,
        time,
        title,
        description
      })
    });
    
    setIsModalOpen(false);
    refresh();
  };
  
  const getUpcomingKontakSchedules = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const future = kontakSchedules.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= today && (user.role === 'Super Administrator' || kontakan.find(g => g.id === s.kontakanId)?.createdBy === user.ustadzName);
    });
    return future.sort((a,b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    }).slice(0, 5);
  };
  const upcoming = getUpcomingKontakSchedules();

  // ICS Export
  const handleExportICS = () => {
    if (kontakSchedules.length === 0) return alert('Tidak ada jadwal plan kontak untuk diexport');
    const icsEvents: ICSEvent[] = kontakSchedules.map(s => {
      const k = kontakan.find(item => item.id === s.kontakanId);
      return {
        id: s.id,
        title: s.title,
        description: `${s.description || ''}\nTarget Kontak: ${k?.name || 'N/A'}`.trim(),
        date: s.date,
        time: s.time
      };
    });
    downloadICS('Kalender_Plan_Kontak.ics', 'Kalender Plan Kontak Daris', icsEvents);
  };

  // ICS Import
  const handleICSSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseICS(text);
      if (parsed.length === 0) {
        alert('Tidak ditemukan event kalender yang valid pada file .ics ini.');
        return;
      }
      setIcsPreview(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmICSImport = async () => {
    if (!icsPreview || icsPreview.length === 0) return;
    setIsImporting(true);
    try {
      const newSchedules: KontakSchedule[] = icsPreview.map(ev => ({
        id: 'ksch-' + Math.random().toString(36).substr(2, 9),
        kontakanId: kontakan[0]?.id || 'default-kontakan',
        date: ev.date,
        time: ev.time || '16:00',
        title: ev.title,
        description: ev.description || ''
      }));

      const res = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'kontakSchedules', items: newSchedules })
      });

      if (res.ok) {
        setIcsPreview(null);
        refresh();
        alert(`Berhasil mengimpor ${newSchedules.length} plan kontak ke kalender!`);
      } else {
        alert('Gagal mengimpor plan kontak ke server');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden ICS file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleICSSelect}
        accept=".ics,text/calendar"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kalender Plan Kontak</h2>
          <p className="text-slate-500 text-sm">Jadwal follow-up dan agenda interaksi kontakan</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded transition"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
            <span className="font-bold text-slate-800 text-xs w-28 text-center">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded transition"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          </div>

          <button
            onClick={handleExportICS}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Export ke Google / Apple / Outlook / Android Calendar (.ics)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Kalender (.ics)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Import dari Google / Apple / Outlook / Android Calendar (.ics)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import Kalender (.ics)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 flex flex-col">
          <div className="min-w-[700px] flex-1 flex flex-col">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
              {DAYS.map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-0">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {blanks.map(b => (
                <div key={`blank-${b}`} className="border-r border-b border-slate-100 bg-slate-50/50 min-h-[100px] sm:min-h-[120px]"></div>
              ))}
              {days.map(d => {
                const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                const dayKontakSchedules = getKontakSchedulesForDate(dateStr);
                const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

                return (
                  <div key={d} className={`border-r border-b border-slate-100 min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 relative group transition ${isToday ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-semibold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}>{d}</span>
                      <button onClick={() => openAddModal(d)} className="opacity-0 group-hover:opacity-100 p-1 text-emerald-600 hover:bg-emerald-100 rounded transition" title="Tambah Jadwal">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1 mt-2">
                      {dayKontakSchedules.map(s => {
                        const group = kontakan.find(g => g.id === s.kontakanId);
                        return (
                          <div key={s.id} onClick={() => openEditModal(s)} className="text-[9px] sm:text-[10px] p-1 sm:p-1.5 bg-emerald-100 text-emerald-800 rounded cursor-pointer hover:bg-emerald-200 transition border border-emerald-200 truncate" title={`${s.time} - ${s.title}`}>
                            <span className="font-bold">{s.time}</span> {group?.name}: {s.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">5 Plan Kontak Mendatang</h3>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map(s => {
                const group = kontakan.find(g => g.id === s.kontakanId);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{s.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{group?.name} • {s.description || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 text-sm">{new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">{s.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Tidak ada plan kontak mendatang.</p>
          )}
        </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
            </div>
            <form onSubmit={saveKontakSchedule} className="p-6 space-y-4">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kontakan</label>
                  <select required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={kontakanId} onChange={e => setKontakanId(e.target.value)}>
                    <option value="">Pilih</option>
                    {displayedKontakans.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Materi Kajian (Silabus)
                </label>
                <select
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={materialId}
                  onChange={e => {
                    const mId = e.target.value;
                    setMaterialId(mId);
                    const mat = materials.find(m => m.id === mId);
                    if (mat && !title) {
                      setTitle(`Pertemuan ${mat.meeting}: ${mat.title}`);
                    }
                  }}
                >
                  <option value="">-- Pilih Materi Kajian (Opsional) --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      Pertemuan {m.meeting}: {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Judul Plan Kontak</label>
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

      {/* ICS Preview Modal */}
      {icsPreview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-600" />
                  Konfirmasi Import Kalender Plan Kontak (.ics)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{icsPreview.length} agenda kontak</strong> dari file kalender (Google/Apple/Outlook).
                </p>
              </div>
              <button 
                onClick={() => setIcsPreview(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {icsPreview.map((ev, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{idx + 1}. {ev.title}</span>
                    <span className="text-emerald-700 font-semibold text-[11px]">{ev.date} {ev.time || ''}</span>
                  </div>
                  {ev.description && (
                    <div className="text-[11px] text-slate-500 line-clamp-2">
                      {ev.description}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIcsPreview(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={confirmICSImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isImporting ? 'Mengimpor...' : `Impor ${icsPreview.length} Agenda ke Kalender`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
