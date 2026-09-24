import React, { useMemo, useState } from 'react';
import { 
  Group, 
  Student, 
  Ustadz, 
  Schedule, 
  Progress, 
  Material, 
  Kontakan, 
  KontakSchedule, 
  KontakProgress, 
  User,
  AgendaEvent,
  AgendaProgress
} from '../types';
import { 
  GraduationCap, 
  PhoneCall, 
  Users, 
  Calendar, 
  ArrowRight, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  PlusCircle, 
  CalendarDays, 
  ChevronRight,
  CheckCircle2,
  Sparkles,
  CalendarHeart,
  CalendarRange,
  ClipboardCheck,
  BellRing,
  Video,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
  RotateCcw,
  Filter,
  X
} from 'lucide-react';

interface DashboardPanelProps {
  groups: Group[];
  students: Student[];
  ustadzList: Ustadz[];
  schedules: Schedule[];
  progress: Progress[];
  materials: Material[];
  kontakan: Kontakan[];
  kontakSchedules: KontakSchedule[];
  kontakProgress: KontakProgress[];
  agendaEvents?: AgendaEvent[];
  agendaProgress?: AgendaProgress[];
  user: User;
  onNavigate: (tab: string) => void;
}

type TimeRangePreset = 'all' | 'today' | 'this-week' | 'this-month' | 'custom';

export default function DashboardPanel({
  groups,
  students,
  ustadzList,
  schedules,
  progress,
  materials,
  kontakan,
  kontakSchedules,
  kontakProgress,
  agendaEvents = [],
  agendaProgress = [],
  user,
  onNavigate,
}: DashboardPanelProps) {
  const isSuperAdmin = user.role === 'Super Administrator';

  // Quick Filter States
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Role-filtered baseline datasets
  const relevantGroups = useMemo(() => {
    return isSuperAdmin ? groups : groups.filter(g => g.ustadz === user.ustadzName);
  }, [groups, isSuperAdmin, user.ustadzName]);

  const relevantGroupIds = useMemo(() => new Set(relevantGroups.map(g => g.id)), [relevantGroups]);

  const relevantStudents = useMemo(() => {
    if (isSuperAdmin) return students;
    const assignedNames = new Set<string>();
    relevantGroups.forEach(g => g.students.forEach(s => assignedNames.add(s)));
    return students.filter(s => s.createdBy === user.ustadzName || assignedNames.has(s.name));
  }, [students, isSuperAdmin, relevantGroups, user.ustadzName]);

  const relevantKontakan = useMemo(() => {
    return isSuperAdmin ? kontakan : kontakan.filter(k => k.createdBy === user.ustadzName);
  }, [kontakan, isSuperAdmin, user.ustadzName]);

  const relevantKontakanIds = useMemo(() => new Set(relevantKontakan.map(k => k.id)), [relevantKontakan]);

  // Today string for date comparisons
  const todayStr = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }, []);

  // Compute date range boundary based on timeRange
  const dateRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (timeRange === 'today') {
      const today = formatYMD(now);
      return { start: today, end: today };
    }
    if (timeRange === 'this-week') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: formatYMD(monday), end: formatYMD(sunday) };
    }
    if (timeRange === 'this-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatYMD(firstDay), end: formatYMD(lastDay) };
    }
    if (timeRange === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: '', end: '' };
  }, [timeRange, customStartDate, customEndDate]);

  // Filtered Datasets based on selectedGroupId & dateRange
  const filteredGroups = useMemo(() => {
    if (selectedGroupId === 'ALL') return relevantGroups;
    return relevantGroups.filter(g => g.id === selectedGroupId);
  }, [relevantGroups, selectedGroupId]);

  const filteredGroupIds = useMemo(() => new Set(filteredGroups.map(g => g.id)), [filteredGroups]);

  const filteredStudents = useMemo(() => {
    if (selectedGroupId === 'ALL') return relevantStudents;
    const targetGroup = relevantGroups.find(g => g.id === selectedGroupId);
    if (!targetGroup) return relevantStudents;
    const memberNames = new Set(targetGroup.students);
    return relevantStudents.filter(s => memberNames.has(s.name) || s.groupId === targetGroup.id);
  }, [relevantStudents, selectedGroupId, relevantGroups]);

  const filteredKontakan = useMemo(() => {
    if (selectedGroupId === 'ALL') return relevantKontakan;
    const targetGroup = relevantGroups.find(g => g.id === selectedGroupId);
    if (!targetGroup) return relevantKontakan;
    return relevantKontakan.filter(k => k.createdBy === targetGroup.ustadz);
  }, [relevantKontakan, selectedGroupId, relevantGroups]);

  const filteredKontakanIds = useMemo(() => new Set(filteredKontakan.map(k => k.id)), [filteredKontakan]);

  // Filtered Halaqoh Schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const matchRole = isSuperAdmin || relevantGroupIds.has(s.groupId);
      if (!matchRole) return false;
      const matchGroup = selectedGroupId === 'ALL' || s.groupId === selectedGroupId;
      if (!matchGroup) return false;
      if (dateRange.start && s.date < dateRange.start) return false;
      if (dateRange.end && s.date > dateRange.end) return false;
      return true;
    });
  }, [schedules, isSuperAdmin, relevantGroupIds, selectedGroupId, dateRange]);

  // Upcoming Halaqoh Schedules (sorted ascending)
  const upcomingHalaqoh = useMemo(() => {
    const list = schedules.filter(s => {
      const matchRole = isSuperAdmin || relevantGroupIds.has(s.groupId);
      if (!matchRole) return false;
      const matchGroup = selectedGroupId === 'ALL' || s.groupId === selectedGroupId;
      if (!matchGroup) return false;
      if (timeRange === 'all') {
        return s.date >= todayStr;
      }
      if (dateRange.start && s.date < dateRange.start) return false;
      if (dateRange.end && s.date > dateRange.end) return false;
      return true;
    });

    list.sort((a, b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    });

    return list.slice(0, 4);
  }, [schedules, isSuperAdmin, relevantGroupIds, selectedGroupId, timeRange, dateRange, todayStr]);

  // Filtered Kontak Schedules
  const filteredKontakSchedules = useMemo(() => {
    return kontakSchedules.filter(s => {
      const matchRole = isSuperAdmin || relevantKontakanIds.has(s.kontakanId);
      if (!matchRole) return false;
      const matchKontak = selectedGroupId === 'ALL' || filteredKontakanIds.has(s.kontakanId);
      if (!matchKontak) return false;
      if (dateRange.start && s.date < dateRange.start) return false;
      if (dateRange.end && s.date > dateRange.end) return false;
      return true;
    });
  }, [kontakSchedules, isSuperAdmin, relevantKontakanIds, selectedGroupId, filteredKontakanIds, dateRange]);

  // Upcoming Kontak Schedules (sorted ascending)
  const upcomingKontak = useMemo(() => {
    const list = kontakSchedules.filter(s => {
      const matchRole = isSuperAdmin || relevantKontakanIds.has(s.kontakanId);
      if (!matchRole) return false;
      const matchKontak = selectedGroupId === 'ALL' || filteredKontakanIds.has(s.kontakanId);
      if (!matchKontak) return false;
      if (timeRange === 'all') {
        return s.date >= todayStr;
      }
      if (dateRange.start && s.date < dateRange.start) return false;
      if (dateRange.end && s.date > dateRange.end) return false;
      return true;
    });

    list.sort((a, b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    });

    return list.slice(0, 4);
  }, [kontakSchedules, isSuperAdmin, relevantKontakanIds, selectedGroupId, filteredKontakanIds, timeRange, dateRange, todayStr]);

  // Filtered Progress Records
  const filteredProgress = useMemo(() => {
    return progress.filter(p => {
      const matchRole = isSuperAdmin || relevantGroupIds.has(p.groupId);
      if (!matchRole) return false;
      const matchGroup = selectedGroupId === 'ALL' || p.groupId === selectedGroupId;
      if (!matchGroup) return false;
      const pDate = p.date.split(' ')[0];
      if (dateRange.start && pDate < dateRange.start) return false;
      if (dateRange.end && pDate > dateRange.end) return false;
      return true;
    });
  }, [progress, isSuperAdmin, relevantGroupIds, selectedGroupId, dateRange]);

  // Recent Progress Records (sorted descending by date)
  const recentProgress = useMemo(() => {
    const list = [...filteredProgress];
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list.slice(0, 4);
  }, [filteredProgress]);

  // Kontakan Pipeline Stages Breakdown (based on filteredKontakan)
  const pipelineStats = useMemo(() => {
    const counts: Record<string, number> = {
      CKA: 0,
      S0: 0,
      S1: 0,
      S2: 0,
      S3: 0,
      S4: 0,
      PD: 0,
      DIK: 0,
      Pelajar: 0,
    };
    filteredKontakan.forEach(k => {
      const st = k.status || 'CKA';
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return counts;
  }, [filteredKontakan]);

  // Active filter state detection & labels
  const hasActiveFilter = selectedGroupId !== 'ALL' || timeRange !== 'all';

  const selectedGroupName = useMemo(() => {
    if (selectedGroupId === 'ALL') return 'Semua Kelompok';
    const g = relevantGroups.find(x => x.id === selectedGroupId);
    return g ? `Kelompok Ustadz ${g.ustadz}` : 'Kelompok Terpilih';
  }, [selectedGroupId, relevantGroups]);

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case 'today': return 'Hari Ini';
      case 'this-week': return 'Pekan Ini';
      case 'this-month': return 'Bulan Ini';
      case 'custom':
        if (customStartDate && customEndDate) return `${customStartDate} s/d ${customEndDate}`;
        if (customStartDate) return `Mulai ${customStartDate}`;
        if (customEndDate) return `Hingga ${customEndDate}`;
        return 'Kustom Tanggal';
      default: return 'Semua Waktu';
    }
  }, [timeRange, customStartDate, customEndDate]);

  const handleResetFilters = () => {
    setSelectedGroupId('ALL');
    setTimeRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Helper date formatter
  const formatDate = (dStr: string) => {
    try {
      const [year, month, day] = dStr.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dStr;
    }
  };

  // Urgent alerts within 1 hour for Dashboard banner
  const urgentAlerts = useMemo(() => {
    const now = Date.now();
    const alerts: Array<{
      id: string;
      title: string;
      category: string;
      time: string;
      diffMinutes: number;
      targetTab: string;
      mode?: string;
      location?: string;
    }> = [];

    // Check schedules
    schedules.forEach(s => {
      const matchRole = isSuperAdmin || relevantGroupIds.has(s.groupId);
      if (!matchRole || !s.date || !s.time) return;
      const t = new Date(`${s.date}T${s.time}:00`).getTime();
      if (isNaN(t)) return;
      const diff = Math.round((t - now) / 60000);
      if (diff >= -15 && diff <= 60) {
        alerts.push({
          id: s.id,
          title: s.title || 'Kajian Rutin',
          category: 'Kajian Pekanan',
          time: s.time,
          diffMinutes: diff,
          targetTab: 'calendar'
        });
      }
    });

    // Check agendaEvents
    agendaEvents.forEach(ev => {
      if (user.role === 'Ustadz') {
        const isInvited = ev.invitedUstadz?.some(u => u.toLowerCase() === user.ustadzName.toLowerCase() || u === user.id);
        const isCreator = ev.createdBy === user.ustadzName || ev.createdBy === user.username;
        if (!isInvited && !isCreator && ev.invitedUstadz && ev.invitedUstadz.length > 0) return;
      }
      if (!ev.date || !ev.time) return;
      const t = new Date(`${ev.date}T${ev.time}:00`).getTime();
      if (isNaN(t)) return;
      const diff = Math.round((t - now) / 60000);
      if (diff >= -15 && diff <= 60) {
        alerts.push({
          id: ev.id,
          title: ev.title,
          category: ev.type,
          time: ev.time,
          diffMinutes: diff,
          targetTab: 'agenda-calendar',
          mode: ev.meetingMode,
          location: ev.location
        });
      }
    });

    alerts.sort((a, b) => a.diffMinutes - b.diffMinutes);
    return alerts;
  }, [schedules, agendaEvents, isSuperAdmin, relevantGroupIds, user]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Greeting & Role Context Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <GraduationCap className="w-64 h-64 text-white -mr-16 -mt-16" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSuperAdmin ? 'Pusat Kendali Administrator' : `Ustadz Pembina: ${user.ustadzName}`}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Ahlan wa Sahlan, {user.username}
            </h2>
            <p className="text-emerald-100/80 text-sm mt-1 max-w-xl">
              Berikut adalah ringkasan perkembangan halaqoh, data daris, progres kontakan, dan jadwal kegiatan yang akan datang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
            <button
              onClick={() => onNavigate('calendar')}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Jadwal Kajian
            </button>
            <button
              onClick={() => onNavigate('kontak-calendar')}
              className="px-4 py-2 bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition border border-emerald-600/50 flex items-center gap-1.5"
            >
              <CalendarHeart className="w-3.5 h-3.5" />
              Jadwal Kontak
            </button>
          </div>
        </div>
      </div>

      {/* Urgent 1-Hour Alert Banner */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Peringatan Jadwal (&lt; 1 Jam)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                    {urgentAlerts[0].diffMinutes > 0 ? `Dimulai dalam ${urgentAlerts[0].diffMinutes} menit` : 'Sedang Dimulai'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">
                  {urgentAlerts[0].title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {urgentAlerts[0].category} • Pukul <strong className="text-amber-800">{urgentAlerts[0].time} WIB</strong>
                  {urgentAlerts[0].location ? ` • ${urgentAlerts[0].mode || 'Lokasi'}: ${urgentAlerts[0].location}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              {urgentAlerts[0].mode === 'Online' && urgentAlerts[0].location?.startsWith('http') && (
                <a
                  href={urgentAlerts[0].location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  Masuk Link
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )}
              <button
                onClick={() => onNavigate(urgentAlerts[0].targetTab)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Lihat di Kalender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Filter Cepat Ringkasan Dashboard</h3>
                {hasActiveFilter && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Filter Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesuaikan ringkasan statistik, tahapan pipeline, dan jadwal berdasarkan kelompok atau rentang waktu
              </p>
            </div>
          </div>

          {hasActiveFilter && (
            <button
              onClick={handleResetFilters}
              className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Kembalikan ke semua data"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
          {/* Filter Kelompok / Kategori Halaqoh (5 cols) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Kategori / Kelompok Halaqoh
            </label>
            <div className="relative">
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="ALL">Semua Kelompok Halaqoh ({relevantGroups.length})</option>
                {relevantGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    Kelompok Ustadz {g.ustadz} ({g.students.length} Daris)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Rentang Waktu (7 cols) */}
          <div className="md:col-span-7 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Rentang Waktu Statistik & Jadwal
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all', label: 'Semua Waktu' },
                { key: 'today', label: 'Hari Ini' },
                { key: 'this-week', label: 'Pekan Ini' },
                { key: 'this-month', label: 'Bulan Ini' },
                { key: 'custom', label: 'Kustom Tanggal' },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTimeRange(item.key as TimeRangePreset)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    timeRange === item.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Date Pickers (if custom selected) */}
        {timeRange === 'custom' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Dari Tanggal:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <span className="text-xs text-emerald-700 font-medium">
                Aktif: {customStartDate || 'Awal'} s/d {customEndDate || 'Sekarang'}
              </span>
            )}
          </div>
        )}

        {/* Active Filter Summary Bar */}
        {hasActiveFilter && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                Menampilkan: <strong>{selectedGroupName}</strong> • <strong>{timeRangeLabel}</strong>
              </span>
            </div>
            <div className="text-slate-500 text-[11px] font-medium flex items-center gap-2">
              <span>{filteredStudents.length} Daris</span>
              <span>·</span>
              <span>{filteredKontakan.length} Calon Daris</span>
              <span>·</span>
              <span>{filteredProgress.length} Progres</span>
              <span>·</span>
              <span>{filteredSchedules.length} Jadwal</span>
            </div>
          </div>
        )}
      </div>

      {/* 4 Primary Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Pelajar */}
        <div 
          onClick={() => onNavigate('students')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pelajar (Daris)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{filteredStudents.length}</span>
            <span className="text-xs text-slate-500 font-medium">
              {selectedGroupId !== 'ALL' ? 'daris di kelompok ini' : 'daris terdaftar'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Lihat Direktori Pelajar (Daris)</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stat 2: Total Kontakan */}
        <div 
          onClick={() => onNavigate('kontakan')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calon Daris (Kontakan)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{filteredKontakan.length}</span>
            <span className="text-xs text-slate-500 font-medium">
              {selectedGroupId !== 'ALL' ? 'kontakan ustadz ini' : 'calon daris'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-700 font-semibold">
            <span>{pipelineStats.Pelajar} telah menjadi pelajar (daris)</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stat 3: Kelompok Halaqoh */}
        <div 
          onClick={() => onNavigate('groups')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelompok Halaqoh</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{filteredGroups.length}</span>
            <span className="text-xs text-slate-500 font-medium">
              {selectedGroupId !== 'ALL' ? 'kelompok terpilih' : 'kelompok aktif'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>{selectedGroupId !== 'ALL' ? selectedGroupName : (isSuperAdmin ? `${ustadzList.length} Ustadz Pembina` : 'Kelola Anggota')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stat 4: Total Pertemuan & Silabus */}
        <div 
          onClick={() => onNavigate('progress')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan Progres</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{filteredProgress.length}</span>
            <span className="text-xs text-slate-500 font-medium">
              {hasActiveFilter ? 'pertemuan sesuai filter' : 'pertemuan selesai'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-purple-700 font-semibold">
            <span>{materials.length} Judul Materi Silabus</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Schedules (Halaqoh & Kontak) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jadwal Kajian Halaqoh Terdekat */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Jadwal Kajian {timeRange !== 'all' ? `(${timeRangeLabel})` : 'Terdekat'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
              >
                Lihat Kalender
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingHalaqoh.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm">
                  {hasActiveFilter 
                    ? 'Tidak ada agenda kajian halaqoh pada filter kelompok / rentang waktu ini.' 
                    : 'Belum ada agenda kajian halaqoh mendatang.'}
                </p>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
                >
                  + Tambah Jadwal Kajian
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingHalaqoh.map(item => {
                  const grp = groups.find(g => g.id === item.groupId);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => onNavigate('calendar')}
                      className="p-3.5 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200/80 transition cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-800 transition">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>Ustadz: {grp ? grp.ustadz : 'Kelompok'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{grp ? `${grp.students.length} daris` : ''}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-600 line-clamp-1 mt-1 font-normal">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-emerald-700">
                          {formatDate(item.date)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 mt-0.5 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.time} WIB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {upcomingHalaqoh.length} agenda {hasActiveFilter ? 'sesuai filter' : 'terdekat'}</span>
            <button 
              onClick={() => onNavigate('calendar')} 
              className="font-semibold text-emerald-700 hover:underline"
            >
              Buka Semua Jadwal
            </button>
          </div>
        </div>

        {/* Jadwal Kontak Daris Terdekat */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <CalendarHeart className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  Jadwal Kontak {timeRange !== 'all' ? `(${timeRangeLabel})` : 'Terdekat'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('kontak-calendar')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition"
              >
                Lihat Kalender
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingKontak.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-3">
                <CalendarHeart className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm">
                  {hasActiveFilter 
                    ? 'Tidak ada agenda kontak calon daris pada filter kelompok / rentang waktu ini.'
                    : 'Belum ada agenda kontak calon daris mendatang.'}
                </p>
                <button
                  onClick={() => onNavigate('kontak-calendar')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                >
                  + Tambah Jadwal Kontak
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingKontak.map(item => {
                  const target = kontakan.find(k => k.id === item.kontakanId);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => onNavigate('kontak-calendar')}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/40 rounded-xl border border-slate-200/80 transition cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-800 transition">
                          {target ? target.name : 'Calon Daris'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="font-medium text-blue-600">{target?.status || 'Kontak'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-600 line-clamp-1 mt-1 font-normal">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-blue-700">
                          {formatDate(item.date)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 mt-0.5 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.time} WIB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {upcomingKontak.length} rencana kontak {hasActiveFilter ? 'sesuai filter' : 'terdekat'}</span>
            <button 
              onClick={() => onNavigate('kontak-calendar')} 
              className="font-semibold text-blue-700 hover:underline"
            >
              Buka Semua Rencana
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Pipeline Tahapan Kontakan & Aktivitas Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pipeline Tahapan Calon Daris (Left - 7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Tahapan Pembinaan Calon Daris (Pipeline)</h3>
            </div>
            <button
              onClick={() => onNavigate('kontakan')}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Kelola Kontakan
            </button>
          </div>

          <p className="text-xs text-slate-500">
            {selectedGroupId !== 'ALL'
              ? `Sebaran perkembangan calon daris khusus ${selectedGroupName}:`
              : 'Sebaran tahap perkembangan calon daris dari tahap perkenalan awal hingga resmi masuk kelompok halaqoh:'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">CKA</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.CKA}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Calon Kontakan Awal</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">S0</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.S0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Sudah ditemui & profiling</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">S1</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.S1}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Sepakat Kondisi Rusak</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">S2</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.S2}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Sepakat Sistemnya Rusak</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">S3</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.S3}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Sepakat Solusi Islam</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">S4</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.S4}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Sepakat Solusi Islam Kaffah</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">PD</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.PD}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Pra Dauroh</div>
            </div>

            <div 
              onClick={() => onNavigate('kontakan')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-500">DIK</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pipelineStats.DIK}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">Dauroh Islam Kaffah</div>
            </div>

            <div 
              onClick={() => onNavigate('students')}
              className="p-3 bg-emerald-50 hover:bg-emerald-100/70 rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Pelajar (Daris)
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{pipelineStats.Pelajar}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5 truncate">Resmi di Halaqoh</div>
            </div>
          </div>
        </div>

        {/* Aktivitas Pertemuan Terakhir (Right - 5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base">
              Catatan Pertemuan {timeRange !== 'all' ? `(${timeRangeLabel})` : 'Terakhir'}
            </h3>
            <button
              onClick={() => onNavigate('progress')}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Semua Progres
            </button>
          </div>

          {recentProgress.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {hasActiveFilter 
                ? 'Belum ada absensi halaqoh pada filter kelompok / rentang waktu ini.'
                : 'Belum ada absensi halaqoh tercatat.'}
            </div>
          ) : (
            <div className="space-y-3">
              {recentProgress.map(p => {
                const grp = groups.find(g => g.id === p.groupId);
                const mat = materials.find(m => m.meeting === p.meeting);
                return (
                  <div 
                    key={p.id}
                    onClick={() => onNavigate('progress')}
                    className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        Pertemuan #{p.meeting}: {mat?.title || `Materi ${p.meeting}`}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{formatDate(p.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>Ustadz {grp ? grp.ustadz : '-'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-semibold">{p.attendance.length} daris hadir</span>
                    </div>
                    {p.notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-1 italic">
                        "{p.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-bold text-slate-700">Aksi Cepat:</span>
          <span>Akses menu utama tanpa harus scroll menu samping</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('progress')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            + Input Absensi
          </button>
          <button
            onClick={() => onNavigate('calendar')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            + Jadwalkan Kajian
          </button>
          <button
            onClick={() => onNavigate('kontakan')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            + Tambah Kontakan
          </button>
          <button
            onClick={() => onNavigate('agenda-calendar')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1"
          >
            <CalendarRange className="w-3 h-3 text-slate-500" />
            + Agenda Kegiatan
          </button>
          <button
            onClick={() => onNavigate('agenda-progress')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1"
          >
            <ClipboardCheck className="w-3 h-3 text-slate-500" />
            + Presensi / Liqo
          </button>
          <button
            onClick={() => onNavigate('students')}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg transition border border-emerald-200"
          >
            + Daftar Daris
          </button>
        </div>
      </div>
    </div>
  );
}
