import React, { useState, useRef } from 'react';
import { AgendaEvent, User, Ustadz, Student } from '../types';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, MapPin, Video, Users, Download, Upload, Clock, CheckCircle2, Trash2, Edit3, Filter, FileText } from 'lucide-react';
import { downloadICS, parseICS, ICSEvent } from '../utils/icalendar';

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface AgendaCalendarPanelProps {
  agendaEvents: AgendaEvent[];
  ustadzList: Ustadz[];
  students: Student[];
  refresh: () => void;
  user: User;
  onNavigateToProgress?: (prefill?: Partial<AgendaEvent>) => void;
}

export default function AgendaCalendarPanel({
  agendaEvents,
  ustadzList,
  students,
  refresh,
  user,
  onNavigateToProgress
}: AgendaCalendarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AgendaEvent['type']>('Liqo / Rapat');
  const [meetingMode, setMeetingMode] = useState<'Offline' | 'Online'>('Offline');
  const [location, setLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [description, setDescription] = useState('');
  const [invitedUstadz, setInvitedUstadz] = useState<string[]>([]);
  const [invitedStudents, setInvitedStudents] = useState<string[]>([]);
  const [otherAttendeesInput, setOtherAttendeesInput] = useState('');

  // Filtering
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  // ICS Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [icsPreviewEvents, setIcsPreviewEvents] = useState<ICSEvent[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Search attendees in modal
  const [ustadzSearch, setUstadzSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filtered events
  const filteredEvents = agendaEvents.filter(evt => {
    if (typeFilter !== 'all' && evt.type !== typeFilter) return false;
    if (modeFilter !== 'all' && evt.meetingMode !== modeFilter) return false;
    // If not super admin, check if user is invited or created
    if (user.role !== 'Super Administrator') {
      const isInvitedU = evt.invitedUstadz.includes(user.ustadzName);
      const isCreator = evt.createdBy === user.username || evt.createdBy === user.ustadzName;
      if (!isInvitedU && !isCreator) return false;
    }
    return true;
  });

  const getEventsForDate = (dateStr: string) => {
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const openAddModal = (day?: number) => {
    const dStr = day
      ? `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];
    
    setSelectedDate(dStr);
    setTitle('');
    setType('Liqo / Rapat');
    setMeetingMode('Offline');
    setLocation('');
    setTime('09:00');
    setEndTime('11:00');
    setDescription('');
    setInvitedUstadz(user.ustadzName ? [user.ustadzName] : []);
    setInvitedStudents([]);
    setOtherAttendeesInput('');
    setEditingId(null);
    setUstadzSearch('');
    setStudentSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (evt: AgendaEvent) => {
    setSelectedDate(evt.date);
    setTitle(evt.title);
    setType(evt.type);
    setMeetingMode(evt.meetingMode);
    setLocation(evt.location || '');
    setTime(evt.time || '09:00');
    setEndTime(evt.endTime || '11:00');
    setDescription(evt.description || '');
    setInvitedUstadz(evt.invitedUstadz || []);
    setInvitedStudents(evt.invitedStudents || []);
    setOtherAttendeesInput((evt.invitedOthers || []).join(', '));
    setEditingId(evt.id);
    setUstadzSearch('');
    setStudentSearch('');
    setIsModalOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate) {
      return alert('Mohon isi judul kegiatan dan tanggal');
    }

    const others = otherAttendeesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      type,
      meetingMode,
      location: location.trim(),
      date: selectedDate,
      time,
      endTime,
      description: description.trim(),
      invitedUstadz,
      invitedStudents,
      invitedOthers: others,
      createdBy: user.username
    };

    const url = editingId ? `/api/agendaEvents/${editingId}` : '/api/agendaEvents';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        refresh();
      } else {
        alert('Gagal menyimpan agenda kegiatan');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan');
    }
  };

  const deleteEvent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus agenda kegiatan ini?')) return;

    try {
      const res = await fetch(`/api/agendaEvents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        refresh();
      }
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  // Export iCalendar (.ics)
  const handleExportICS = () => {
    if (filteredEvents.length === 0) {
      return alert('Tidak ada event kegiatan untuk diexport.');
    }
    const icsEvents: ICSEvent[] = filteredEvents.map(e => ({
      id: e.id,
      title: `[${e.type}] ${e.title} (${e.meetingMode})`,
      description: `${e.description ? e.description + '\n\n' : ''}Peserta Diundang:\n- Ustadz: ${e.invitedUstadz.join(', ') || '-'}\n- Pelajar: ${e.invitedStudents.join(', ') || '-'}\n${e.invitedOthers?.length ? '- Lainnya: ' + e.invitedOthers.join(', ') : ''}`,
      location: e.location || (e.meetingMode === 'Online' ? 'Online Meeting' : 'Ruang Pertemuan'),
      date: e.date,
      time: e.time,
      endTime: e.endTime
    }));

    downloadICS('Agenda_Kegiatan_HalaqohPro.ics', 'Kalender Agenda Kegiatan HalaqohPro', icsEvents);
  };

  // Trigger file input for ICS import
  const handleICSFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseICS(text);
        if (parsed.length === 0) {
          alert('Tidak ditemukan event kalender yang valid pada file .ics ini.');
          return;
        }
        setIcsPreviewEvents(parsed);
      } catch (err) {
        alert('Gagal memproses file .ics: format tidak didukung');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm ICS Import
  const confirmICSImport = async () => {
    if (!icsPreviewEvents || icsPreviewEvents.length === 0) return;
    setIsImporting(true);

    const newAgendaItems = icsPreviewEvents.map(evt => {
      const isOnline = (evt.location && /zoom|meet|http|teams|webex/i.test(evt.location)) || /online/i.test(evt.title);
      return {
        title: evt.title,
        type: /rapat|liqo/i.test(evt.title) ? 'Liqo / Rapat' : 'Kajian Umum',
        meetingMode: isOnline ? 'Online' : 'Offline',
        location: evt.location || '',
        date: evt.date,
        time: evt.time || '09:00',
        endTime: evt.endTime || '11:00',
        description: evt.description || 'Diimpor dari file kalender eksternal (.ics)',
        invitedUstadz: [],
        invitedStudents: [],
        invitedOthers: [],
        createdBy: user.username
      };
    });

    try {
      const res = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'agendaEvents', items: newAgendaItems })
      });
      if (res.ok) {
        setIcsPreviewEvents(null);
        refresh();
        alert(`Berhasil mengimpor ${newAgendaItems.length} agenda kegiatan!`);
      } else {
        alert('Gagal mengimpor data ke server');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsImporting(false);
    }
  };

  // Upcoming events
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = [...filteredEvents]
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date))
    .slice(0, 5);

  const toggleUstadzSelection = (name: string) => {
    setInvitedUstadz(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleStudentSelection = (name: string) => {
    setInvitedStudents(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAllStudents = () => {
    setInvitedStudents(students.map(s => s.name));
  };

  const selectAllUstadz = () => {
    setInvitedUstadz(ustadzList.map(u => u.name));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden File Input for ICS Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleICSFileSelect} 
        accept=".ics,text/calendar" 
        className="hidden" 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-emerald-600" />
            Kalender Agenda Kegiatan
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Jadwalkan agenda rapat, liqo' offline/online, dan monitoring kehadiran peserta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export & Import ICS (Google, Apple, Outlook, Android) */}
          <button
            onClick={handleExportICS}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Export iCalendar (.ics) untuk Google Calendar, Apple, Android, & Outlook"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export .ICS
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Import event dari Google / Apple / Outlook Calendar (.ics)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import .ICS
          </button>

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Agenda
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-xs font-medium text-slate-600">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-700">Filter:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Tipe:</span>
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="Liqo / Rapat">Liqo / Rapat</option>
            <option value="Kajian Umum">Kajian Umum</option>
            <option value="Mabit">Mabit</option>
            <option value="Rihlah / Outing">Rihlah / Outing</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Pelaksanaan:</span>
          <select 
            value={modeFilter} 
            onChange={e => setModeFilter(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Mode</option>
            <option value="Offline">Offline</option>
            <option value="Online">Online</option>
          </select>
        </div>

        <div className="ml-auto text-slate-400 text-xs">
          Total: <strong className="text-slate-700">{filteredEvents.length}</strong> agenda
        </div>
      </div>

      {/* Main Grid: Calendar + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              {MONTHS[month]} {year}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth} 
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
            {DAYS.map(d => (
              <div key={d} className="py-1 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(b => (
              <div key={`blank-${b}`} className="min-h-[85px] p-1 bg-slate-50/50 rounded-lg border border-transparent"></div>
            ))}
            {days.map(d => {
              const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
              const evts = getEventsForDate(dStr);
              const isToday = dStr === todayStr;

              return (
                <div 
                  key={d}
                  onClick={() => openAddModal(d)}
                  className={`min-h-[85px] p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isToday ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-emerald-600 text-white' : 'text-slate-700'
                    }`}>
                      {d}
                    </span>
                    {evts.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {evts.length} event
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[75px] no-scrollbar">
                    {evts.map(evt => {
                      const isLiqo = evt.type === 'Liqo / Rapat';
                      const isOnline = evt.meetingMode === 'Online';

                      return (
                        <div 
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(evt);
                          }}
                          className={`p-1 rounded text-[10px] font-medium border text-left truncate transition ${
                            isLiqo 
                              ? (isOnline ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200')
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                          title={`${evt.title} (${evt.time}) - ${evt.meetingMode}`}
                        >
                          <div className="flex items-center gap-1 truncate font-bold">
                            {isOnline ? <Video className="w-2.5 h-2.5 shrink-0" /> : <MapPin className="w-2.5 h-2.5 shrink-0" />}
                            <span className="truncate">{evt.time || '09:00'} {evt.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Agenda Sidebar (1 Col) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Agenda Terdekat
              </h3>
              <span className="text-xs text-slate-400 font-semibold">{upcomingEvents.length} Mendatang</span>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tidak ada agenda kegiatan mendatang.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingEvents.map(evt => (
                  <div 
                    key={evt.id}
                    onClick={() => openEditModal(evt)}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition cursor-pointer flex flex-col gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {evt.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{evt.date}</span>
                          <span>•</span>
                          <span>{evt.time || '09:00'} - {evt.endTime || '11:00'}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        evt.meetingMode === 'Online'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {evt.meetingMode}
                      </span>
                    </div>

                    {/* Location or Link */}
                    {evt.location && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                        {evt.meetingMode === 'Online' ? (
                          <Video className="w-3 h-3 text-purple-600 shrink-0" />
                        ) : (
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{evt.location}</span>
                      </div>
                    )}

                    {/* Attendees count & quick action */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>
                          {evt.invitedUstadz.length + evt.invitedStudents.length + (evt.invitedOthers?.length || 0)} Peserta Diundang
                        </span>
                      </div>

                      {onNavigateToProgress && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToProgress(evt);
                          }}
                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline"
                          title="Buka atau catat realisasi absensi pertemuan ini di Progres Kegiatan"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Catat Progres
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guide Card */}
          <div className="bg-emerald-950 text-emerald-100 rounded-xl p-5 border border-emerald-800/60 text-xs flex flex-col gap-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Sinkronisasi Universal (.ICS)
            </h4>
            <p className="text-emerald-300 leading-relaxed">
              File <strong>.ICS</strong> yang diexport dari menu ini kompatibel langsung dengan <strong>Google Calendar</strong>, <strong>Apple Calendar</strong> (iPhone & Mac), <strong>Microsoft Outlook</strong>, dan kalender Android bawaan.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Agenda Event */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Agenda Kegiatan' : 'Jadwalkan Agenda Kegiatan / Rapat'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan topik rapat/liqo', moda pelaksanaan, dan daftar peserta yang diundang.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEvent} className="flex flex-col gap-4 text-xs font-medium">
              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Judul Agenda / Nama Rapat *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Contoh: Rapat Evaluasi Bulanan / Liqo' Pekan 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipe Agenda *</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Liqo / Rapat">Liqo / Rapat</option>
                    <option value="Kajian Umum">Kajian Umum</option>
                    <option value="Mabit">Mabit</option>
                    <option value="Rihlah / Outing">Rihlah / Outing</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Mode & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Moda Pelaksanaan *</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setMeetingMode('Offline')}
                      className={`py-1.5 text-center font-bold rounded-md transition ${
                        meetingMode === 'Offline'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Offline
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingMode('Online')}
                      className={`py-1.5 text-center font-bold rounded-md transition ${
                        meetingMode === 'Online'
                          ? 'bg-white text-purple-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Online
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    {meetingMode === 'Offline' ? 'Tempat / Lokasi Fisik Kegiatan *' : 'Tautan Meeting Online (Zoom/Google Meet/dsb) *'}
                  </label>
                  <div className="relative">
                    {meetingMode === 'Offline' ? (
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    ) : (
                      <Video className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    )}
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder={meetingMode === 'Offline' ? 'Contoh: Masjid Al-Falah Lt. 2 / Ruang Diskusi A' : 'Contoh: https://meet.google.com/abc-def-ghi'}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Waktu Mulai *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Waktu Selesai</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description / Agenda Pembahasan */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rencana Pembahasan / Deskripsi</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Isi ringkasan topik yang akan dibahas..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Attendees Checklist Section */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Undang Peserta (Ustadz & Pelajar)
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Terpilih: <strong>{invitedUstadz.length} Ustadz</strong>, <strong>{invitedStudents.length} Pelajar</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ustadz Selection */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px]">List Ustadz</span>
                      <button
                        type="button"
                        onClick={selectAllUstadz}
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        Pilih Semua
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ustadzSearch}
                      onChange={e => setUstadzSearch(e.target.value)}
                      placeholder="Cari ustadz..."
                      className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] outline-none"
                    />
                    <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                      {ustadzList
                        .filter(u => u.name.toLowerCase().includes(ustadzSearch.toLowerCase()))
                        .map(u => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded text-[11px]">
                            <input
                              type="checkbox"
                              checked={invitedUstadz.includes(u.name)}
                              onChange={() => toggleUstadzSelection(u.name)}
                              className="rounded text-emerald-600 focus:ring-0"
                            />
                            <span className="truncate">{u.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Students Selection */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px]">List Pelajar</span>
                      <button
                        type="button"
                        onClick={selectAllStudents}
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        Pilih Semua
                      </button>
                    </div>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Cari pelajar..."
                      className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] outline-none"
                    />
                    <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                      {students
                        .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded text-[11px]">
                            <input
                              type="checkbox"
                              checked={invitedStudents.includes(s.name)}
                              onChange={() => toggleStudentSelection(s.name)}
                              className="rounded text-emerald-600 focus:ring-0"
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Other attendees */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Peserta Lain / Undangan Luar (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={otherAttendeesInput}
                    onChange={e => setOtherAttendeesInput(e.target.value)}
                    placeholder="Contoh: Pak RT, Pengurus DKM, Tamu Undangan"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => deleteEvent(editingId)}
                    className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Jadwalkan Agenda'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ICS Import Preview */}
      {icsPreviewEvents && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Import File Kalender (.ICS)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{icsPreviewEvents.length} event</strong> pada file kalender.
                </p>
              </div>
              <button 
                onClick={() => setIcsPreviewEvents(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {icsPreviewEvents.map((evt, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{evt.title}</span>
                    <span className="text-[10px] text-slate-500">{evt.date} {evt.time}</span>
                  </div>
                  {evt.location && (
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{evt.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIcsPreviewEvents(null)}
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
                {isImporting ? 'Mengimpor...' : `Impor ${icsPreviewEvents.length} Event`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
