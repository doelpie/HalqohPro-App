import React, { useState, useRef } from 'react';
import { AgendaProgress, AgendaEvent, User, Ustadz, Student } from '../types';
import { Plus, Download, Upload, Users, MapPin, Video, Calendar, FileText, CheckCircle2, Trash2, Edit3, Search, Activity, BookOpen } from 'lucide-react';
import { downloadCSV, parseCSV } from '../utils/csv';

interface AgendaProgressPanelProps {
  agendaProgress: AgendaProgress[];
  agendaEvents: AgendaEvent[];
  ustadzList: Ustadz[];
  students: Student[];
  refresh: () => void;
  user: User;
  initialPrefill?: Partial<AgendaEvent> | null;
}

export default function AgendaProgressPanel({
  agendaProgress,
  agendaEvents,
  ustadzList,
  students,
  refresh,
  user,
  initialPrefill
}: AgendaProgressPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(!!initialPrefill);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [selectedEventId, setSelectedEventId] = useState<string>(initialPrefill?.id || '');
  const [title, setTitle] = useState(initialPrefill?.title || '');
  const [type, setType] = useState<AgendaProgress['type']>(initialPrefill?.type || 'Liqo / Rapat');
  const [meetingMode, setMeetingMode] = useState<'Offline' | 'Online'>(initialPrefill?.meetingMode || 'Offline');
  const [location, setLocation] = useState(initialPrefill?.location || '');
  const [date, setDate] = useState(initialPrefill?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialPrefill?.time || '09:00');
  const [liqoCount, setLiqoCount] = useState<number>(() => {
    const liqos = agendaProgress.filter(p => p.type === 'Liqo / Rapat');
    return liqos.length + 1;
  });
  const [attendedUstadz, setAttendedUstadz] = useState<string[]>(initialPrefill?.invitedUstadz || (user.ustadzName ? [user.ustadzName] : []));
  const [attendedStudents, setAttendedStudents] = useState<string[]>(initialPrefill?.invitedStudents || []);
  const [otherAttendeesInput, setOtherAttendeesInput] = useState((initialPrefill?.invitedOthers || []).join(', '));
  const [pembahasan, setPembahasan] = useState(initialPrefill?.description || '');
  const [notes, setNotes] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Attendees Search in Modal
  const [ustadzSearch, setUstadzSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Calculate statistics
  const totalLiqo = agendaProgress.filter(p => p.type === 'Liqo / Rapat').length;
  const totalOffline = agendaProgress.filter(p => p.meetingMode === 'Offline').length;
  const totalOnline = agendaProgress.filter(p => p.meetingMode === 'Online').length;

  const filteredProgress = agendaProgress.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (modeFilter !== 'all' && p.meetingMode !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchPembahasan = p.pembahasan.toLowerCase().includes(q);
      const matchLocation = p.location.toLowerCase().includes(q);
      const matchUstadz = p.attendedUstadz.some(u => u.toLowerCase().includes(q));
      const matchStudent = p.attendedStudents.some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchPembahasan && !matchLocation && !matchUstadz && !matchStudent) {
        return false;
      }
    }
    return true;
  });

  const openAddModal = () => {
    const liqos = agendaProgress.filter(p => p.type === 'Liqo / Rapat');
    setSelectedEventId('');
    setTitle('');
    setType('Liqo / Rapat');
    setMeetingMode('Offline');
    setLocation('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('09:00');
    setLiqoCount(liqos.length + 1);
    setAttendedUstadz(user.ustadzName ? [user.ustadzName] : []);
    setAttendedStudents([]);
    setOtherAttendeesInput('');
    setPembahasan('');
    setNotes('');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleSelectScheduledEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    if (!eventId) return;

    const evt = agendaEvents.find(e => e.id === eventId);
    if (evt) {
      setTitle(evt.title);
      setType(evt.type);
      setMeetingMode(evt.meetingMode);
      setLocation(evt.location || '');
      setDate(evt.date);
      setTime(evt.time || '09:00');
      setAttendedUstadz(evt.invitedUstadz || []);
      setAttendedStudents(evt.invitedStudents || []);
      setOtherAttendeesInput((evt.invitedOthers || []).join(', '));
      setPembahasan(evt.description || '');
    }
  };

  const openEditModal = (p: AgendaProgress) => {
    setSelectedEventId(p.agendaEventId || '');
    setTitle(p.title);
    setType(p.type);
    setMeetingMode(p.meetingMode);
    setLocation(p.location);
    setDate(p.date);
    setTime(p.time || '09:00');
    setLiqoCount(p.liqoCount || 1);
    setAttendedUstadz(p.attendedUstadz || []);
    setAttendedStudents(p.attendedStudents || []);
    setOtherAttendeesInput((p.attendedOthers || []).join(', '));
    setPembahasan(p.pembahasan);
    setNotes(p.notes || '');
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const saveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      return alert('Mohon lengkapi judul dan tanggal pelaksanaan');
    }

    const others = otherAttendeesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      agendaEventId: selectedEventId || undefined,
      title: title.trim(),
      type,
      meetingMode,
      location: location.trim(),
      date,
      time,
      liqoCount: type === 'Liqo / Rapat' ? Number(liqoCount) : undefined,
      attendedUstadz,
      attendedStudents,
      attendedOthers: others,
      pembahasan: pembahasan.trim(),
      notes: notes.trim(),
      createdBy: user.username
    };

    const url = editingId ? `/api/agendaProgress/${editingId}` : '/api/agendaProgress';
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
        alert('Gagal menyimpan catatan progres agenda');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    }
  };

  const deleteProgress = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan kegiatan ini?')) return;
    try {
      const res = await fetch(`/api/agendaProgress/${id}`, { method: 'DELETE' });
      if (res.ok) {
        refresh();
      }
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (agendaProgress.length === 0) return alert('Tidak ada data progres untuk diexport');

    const headers = [
      'Judul Kegiatan',
      'Tipe',
      'Moda',
      'Lokasi / Link',
      'Tanggal',
      'Waktu',
      'Liqo Ke',
      'Ustadz Hadir',
      'Pelajar Hadir',
      'Peserta Lain',
      'Pembahasan',
      'Catatan'
    ];

    const rows = agendaProgress.map(p => [
      p.title,
      p.type,
      p.meetingMode,
      p.location,
      p.date,
      p.time || '',
      p.liqoCount || '',
      p.attendedUstadz.join('; '),
      p.attendedStudents.join('; '),
      (p.attendedOthers || []).join('; '),
      p.pembahasan,
      p.notes || ''
    ]);

    downloadCSV('Laporan_Progres_Agenda_Liqo.csv', headers, rows);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      'Judul Kegiatan',
      'Tipe',
      'Moda',
      'Lokasi / Link',
      'Tanggal',
      'Waktu',
      'Liqo Ke',
      'Ustadz Hadir',
      'Pelajar Hadir',
      'Peserta Lain',
      'Pembahasan',
      'Catatan'
    ];

    const exampleRows = [
      [
        'Liqo Pekan Ke-1',
        'Liqo / Rapat',
        'Offline',
        'Masjid Al-Falah',
        '2026-10-01',
        '09:00',
        '1',
        'Teguh; Ahmad Surya',
        'Anjar; Fharien',
        'Pak Pengurus DKM',
        'Pembahasan silabus bab 1 dan pembagian tugas',
        'Pekan depan membawa modul cetak'
      ],
      [
        'Rapat Koordinasi Ustadz',
        'Liqo / Rapat',
        'Online',
        'https://meet.google.com/xyz-123',
        '2026-10-08',
        '20:00',
        '2',
        'Teguh; Margo; Adi',
        '',
        '',
        'Evaluasi kehadiran daris dan persiapan ujian',
        'Laporan diserahkan paling lambat Sabtu'
      ]
    ];

    downloadCSV('Template_Progres_Agenda_Liqo.csv', headers, exampleRows);
  };

  // CSV Import File Select
  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { rows } = parseCSV(text);
      if (rows.length === 0) {
        alert('File CSV kosong atau tidak memiliki data.');
        return;
      }

      const parsedItems = rows.map(r => ({
        title: r[0] || 'Agenda Kegiatan',
        type: (r[1] as any) || 'Liqo / Rapat',
        meetingMode: (r[2] === 'Online' ? 'Online' : 'Offline') as any,
        location: r[3] || '',
        date: r[4] || new Date().toISOString().split('T')[0],
        time: r[5] || '09:00',
        liqoCount: r[6] ? parseInt(r[6], 10) : undefined,
        attendedUstadz: r[7] ? r[7].split(/[;,]/).map(s => s.trim()).filter(Boolean) : [],
        attendedStudents: r[8] ? r[8].split(/[;,]/).map(s => s.trim()).filter(Boolean) : [],
        attendedOthers: r[9] ? r[9].split(/[;,]/).map(s => s.trim()).filter(Boolean) : [],
        pembahasan: r[10] || '',
        notes: r[11] || '',
        createdBy: user.username
      }));

      setCsvPreviewRows(parsedItems);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmCSVImport = async () => {
    if (!csvPreviewRows || csvPreviewRows.length === 0) return;
    setIsImporting(true);

    try {
      const res = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'agendaProgress', items: csvPreviewRows })
      });
      if (res.ok) {
        setCsvPreviewRows(null);
        refresh();
        alert(`Berhasil mengimpor ${csvPreviewRows.length} catatan progres agenda!`);
      } else {
        alert('Gagal mengimpor data ke server');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleUstadz = (name: string) => {
    setAttendedUstadz(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleStudent = (name: string) => {
    setAttendedStudents(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCSVSelect} 
        accept=".csv,text/csv" 
        className="hidden" 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-emerald-600" />
            Progres Agenda Kegiatan & Liqo'
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Rekam realisasi pertemuan, absensi kehadiran Ustadz & Pelajar, serta notulensi pembahasan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Template CSV */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Download Template CSV Siap Isi"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Template CSV
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Export Data ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          {/* Import CSV */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Import Data dari file CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import CSV
          </button>

          {/* Add Realization */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Catat Kegiatan
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kegiatan</span>
          <span className="text-2xl font-black text-slate-900 mt-1">{agendaProgress.length}</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Pertemuan terlaksana</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Frekuensi Liqo'</span>
          <span className="text-2xl font-black text-emerald-700 mt-1">{totalLiqo} Kali</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Sudah liqo' & rapat</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Moda Offline</span>
          <span className="text-2xl font-black text-slate-800 mt-1">{totalOffline}</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Pertemuan fisik tatap muka</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Moda Online</span>
          <span className="text-2xl font-black text-purple-700 mt-1">{totalOnline}</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Via Zoom / Google Meet</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari judul, lokasi, ustadz, pelajar, pembahasan..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Tipe:</span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Tipe</option>
            <option value="Liqo / Rapat">Liqo / Rapat</option>
            <option value="Kajian Umum">Kajian Umum</option>
            <option value="Mabit">Mabit</option>
            <option value="Rihlah / Outing">Rihlah / Outing</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Moda:</span>
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Moda</option>
            <option value="Offline">Offline</option>
            <option value="Online">Online</option>
          </select>
        </div>
      </div>

      {/* Records List */}
      {filteredProgress.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-700 text-sm">Belum ada catatan progres kegiatan</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            Klik tombol "Catat Kegiatan" di atas untuk menambahkan hasil realisasi rapat/liqo', absensi kehadiran, dan notulensi pembahasan.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredProgress.map((item) => {
            const isLiqo = item.type === 'Liqo / Rapat';
            const totalAttended = item.attendedUstadz.length + item.attendedStudents.length + (item.attendedOthers?.length || 0);

            return (
              <div 
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition p-5 flex flex-col gap-4"
              >
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">
                        {item.title}
                      </h3>
                      {isLiqo && item.liqoCount && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-xs rounded-md">
                          Liqo' Ke-{item.liqoCount}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        item.meetingMode === 'Online'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {item.meetingMode}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {item.date} {item.time && `• ${item.time}`}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 truncate">
                        {item.meetingMode === 'Online' ? (
                          <Video className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{item.location || 'Lokasi tidak diset'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Catatan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProgress(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Attendees Section */}
                <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/70 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Presensi Hadir ({totalAttended} Peserta):
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {/* Ustadz */}
                    {item.attendedUstadz.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-slate-500 shrink-0 min-w-[70px]">Ustadz:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.attendedUstadz.map((u, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Students */}
                    {item.attendedStudents.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-slate-500 shrink-0 min-w-[70px]">Pelajar:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.attendedStudents.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Others */}
                    {item.attendedOthers && item.attendedOthers.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-slate-500 shrink-0 min-w-[70px]">Lainnya:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.attendedOthers.map((o, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                              {o}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {totalAttended === 0 && (
                      <span className="text-slate-400 italic">Belum ada daftar hadir yang dicatat.</span>
                    )}
                  </div>
                </div>

                {/* Pembahasan / Notulensi */}
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Hasil Pembahasan / Notulensi Rapat:
                  </span>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {item.pembahasan || <span className="text-slate-400 italic">Tidak ada rincian pembahasan.</span>}
                  </div>
                </div>

                {/* Notes / Tindak Lanjut */}
                {item.notes && (
                  <div className="text-xs bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-amber-900 flex items-start gap-2">
                    <span className="font-bold shrink-0">Catatan / Action Items:</span>
                    <span>{item.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Tambah / Edit Realisasi Progres */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Progres Agenda Kegiatan' : 'Catat Realisasi Progres Kegiatan / Liqo'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi kehadiran peserta yang hadir, lokasi, dan notulensi pembahasan rapat/liqo'.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveProgress} className="flex flex-col gap-4 text-xs font-medium">
              {/* Optional Link to Scheduled Calendar Event */}
              {!editingId && agendaEvents.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="block text-slate-700 font-bold mb-1">
                    Ambil dari Jadwal Kalender Kegiatan (Opsional):
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={e => handleSelectScheduledEvent(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                  >
                    <option value="">-- Buat Catatan Bebas / Tidak Terkait Kalender --</option>
                    {agendaEvents.map(evt => (
                      <option key={evt.id} value={evt.id}>
                        [{evt.date}] {evt.title} ({evt.type} - {evt.meetingMode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Judul Kegiatan / Rapat *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Contoh: Liqo' Pekan Ke-4 / Rapat Evaluasi Panitia"
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

              {/* Liqo Counter & Moda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {type === 'Liqo / Rapat' && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Sudah Liqo' Ke-Berapa?</label>
                    <input
                      type="number"
                      min={1}
                      value={liqoCount}
                      onChange={e => setLiqoCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-emerald-800 focus:outline-none"
                    />
                  </div>
                )}

                <div className={type === 'Liqo / Rapat' ? '' : 'sm:col-span-1'}>
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

                <div className={type === 'Liqo / Rapat' ? '' : 'sm:col-span-2'}>
                  <label className="block text-slate-700 font-bold mb-1">
                    {meetingMode === 'Offline' ? 'Tempat Lokasi Fisik Kegiatan *' : 'Tautan Meeting Online *'}
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
                      placeholder={meetingMode === 'Offline' ? 'Contoh: Masjid Al-Falah / Aula Kantor' : 'Contoh: https://meet.google.com/xyz'}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal Pelaksanaan *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Waktu Pelaksanaan</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Attendees Checklist */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Absensi Kehadiran Peserta (Centang yang Hadir)
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Hadir: <strong>{attendedUstadz.length} Ustadz</strong>, <strong>{attendedStudents.length} Pelajar</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ustadz */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px]">Ustadz yang Hadir</span>
                      <button
                        type="button"
                        onClick={() => setAttendedUstadz(ustadzList.map(u => u.name))}
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        Semua Hadir
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ustadzSearch}
                      onChange={e => setUstadzSearch(e.target.value)}
                      placeholder="Cari nama ustadz..."
                      className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] outline-none"
                    />
                    <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                      {ustadzList
                        .filter(u => u.name.toLowerCase().includes(ustadzSearch.toLowerCase()))
                        .map(u => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded text-[11px]">
                            <input
                              type="checkbox"
                              checked={attendedUstadz.includes(u.name)}
                              onChange={() => toggleUstadz(u.name)}
                              className="rounded text-emerald-600 focus:ring-0"
                            />
                            <span className="truncate">{u.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Students */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px]">Pelajar yang Hadir</span>
                      <button
                        type="button"
                        onClick={() => setAttendedStudents(students.map(s => s.name))}
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        Semua Hadir
                      </button>
                    </div>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Cari nama pelajar..."
                      className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] outline-none"
                    />
                    <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                      {students
                        .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded text-[11px]">
                            <input
                              type="checkbox"
                              checked={attendedStudents.includes(s.name)}
                              onChange={() => toggleStudent(s.name)}
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
                    Peserta Lain yang Hadir (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={otherAttendeesInput}
                    onChange={e => setOtherAttendeesInput(e.target.value)}
                    placeholder="Contoh: Pak RT, Tamu Undangan, Pengurus DKM"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Pembahasan / Notulensi Rapat */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Hasil Pembahasan / Notulensi Rapat *
                </label>
                <textarea
                  rows={4}
                  required
                  value={pembahasan}
                  onChange={e => setPembahasan(e.target.value)}
                  placeholder="Catat isi materi, keputusan rapat, poin-poin diskusi yang telah disepakati..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Notes / Tindak Lanjut */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Catatan Tambahan & Tindak Lanjut (Action Items)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contoh: Follow up tugas daris A, persiapan sewa tempat untuk bulan depan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
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
                  {editingId ? 'Simpan Perubahan' : 'Simpan Progres Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV Preview & Import */}
      {csvPreviewRows && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Import CSV Progres Agenda
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{csvPreviewRows.length} baris data</strong> siap diimpor.
                </p>
              </div>
              <button 
                onClick={() => setCsvPreviewRows(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {csvPreviewRows.map((row, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{row.title}</span>
                    <span className="text-[10px] text-slate-500">{row.date} {row.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Moda: {row.meetingMode}</span>
                    <span>•</span>
                    <span>Lokasi: {row.location || '-'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCsvPreviewRows(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={confirmCSVImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isImporting ? 'Mengimpor...' : `Impor ${csvPreviewRows.length} Data`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
