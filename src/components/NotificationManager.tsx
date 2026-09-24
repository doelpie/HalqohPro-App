import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Schedule, AgendaEvent, KontakSchedule, Group, User, UpcomingAlert } from '../types';
import { 
  Bell, 
  BellRing, 
  Clock, 
  MapPin, 
  Video, 
  ExternalLink, 
  X, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

// Chime using Web Audio API (lightweight, zero external asset dependencies)
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First chime note (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Second chime note (A5) for harmonious bell sound
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.09, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch {
    // Audio context may be restricted by browser until user gesture
  }
}

interface NotificationManagerProps {
  schedules: Schedule[];
  agendaEvents: AgendaEvent[];
  kontakSchedules?: KontakSchedule[];
  groups: Group[];
  user: User;
  onNavigate: (tab: string) => void;
  onNavigateToProgress?: (prefill?: any) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

export default function NotificationManager({
  schedules,
  agendaEvents,
  kontakSchedules = [],
  groups,
  user,
  onNavigate,
  onNavigateToProgress,
  isModalOpen,
  setIsModalOpen
}: NotificationManagerProps) {
  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('halaqoh_alert_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Keep track of dismissed alerts during this session
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  // Current time state for periodic tick (every 30 seconds)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Modal detailed selection
  const [selectedAlert, setSelectedAlert] = useState<UpcomingAlert | null>(null);

  // Simulated alert for testing
  const [simulatedAlert, setSimulatedAlert] = useState<UpcomingAlert | null>(null);

  // Track if we already chimed for an alert id
  const chimedAlertIdsRef = useRef<Set<string>>(new Set());

  // Periodic tick every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem('halaqoh_alert_sound', String(nextVal));
    } catch {
      // ignore
    }
    if (nextVal) {
      playChimeSound();
    }
  };

  // Extract and calculate upcoming alerts
  const { alertsWithinHour, upcomingToday } = useMemo(() => {
    const withinHour: UpcomingAlert[] = [];
    const todayList: UpcomingAlert[] = [];

    const now = currentTime.getTime();

    // 1. Process Kajian Schedules
    schedules.forEach(s => {
      // Permission check: if Ustadz, only their groups
      if (user.role === 'Ustadz') {
        const grp = groups.find(g => g.id === s.groupId);
        if (grp && grp.ustadz !== user.ustadzName) return;
      }

      if (!s.date || !s.time) return;
      const eventDate = new Date(`${s.date}T${s.time}:00`);
      if (isNaN(eventDate.getTime())) return;

      const diffMs = eventDate.getTime() - now;
      const diffMinutes = Math.round(diffMs / 60000);

      const grp = groups.find(g => g.id === s.groupId);
      const groupName = grp ? `Kelompok ${grp.ustadz}` : 'Kelompok Kajian';

      const alertItem: UpcomingAlert = {
        id: `kajian-${s.id}`,
        source: 'kajian',
        title: s.title || `Kajian Rutin - ${groupName}`,
        category: 'Kajian Pekanan',
        date: s.date,
        time: s.time,
        diffMinutes,
        description: s.description,
        groupOrTarget: groupName,
        rawEvent: s
      };

      // Within 1 hour (between -15 mins and +60 mins)
      if (diffMinutes >= -15 && diffMinutes <= 60) {
        withinHour.push(alertItem);
      } else if (diffMinutes > 60 && diffMinutes <= 24 * 60) {
        todayList.push(alertItem);
      }
    });

    // 2. Process Agenda Events (Liqo / Rapat / Kajian Umum, etc.)
    agendaEvents.forEach(ev => {
      // Permission check: if Ustadz, check if invited or creator
      if (user.role === 'Ustadz') {
        const isInvited = ev.invitedUstadz?.some(u => u.toLowerCase() === user.ustadzName.toLowerCase() || u === user.id);
        const isCreator = ev.createdBy === user.ustadzName || ev.createdBy === user.username;
        if (!isInvited && !isCreator && ev.invitedUstadz && ev.invitedUstadz.length > 0) {
          // not invited
          return;
        }
      }

      if (!ev.date || !ev.time) return;
      const eventDate = new Date(`${ev.date}T${ev.time}:00`);
      if (isNaN(eventDate.getTime())) return;

      const diffMs = eventDate.getTime() - now;
      const diffMinutes = Math.round(diffMs / 60000);

      const alertItem: UpcomingAlert = {
        id: `agenda-${ev.id}`,
        source: 'agenda',
        title: ev.title,
        category: ev.type,
        date: ev.date,
        time: ev.time,
        diffMinutes,
        meetingMode: ev.meetingMode,
        location: ev.location,
        description: ev.description,
        invitedList: [...(ev.invitedUstadz || []), ...(ev.invitedStudents || [])],
        rawEvent: ev
      };

      if (diffMinutes >= -15 && diffMinutes <= 60) {
        withinHour.push(alertItem);
      } else if (diffMinutes > 60 && diffMinutes <= 24 * 60) {
        todayList.push(alertItem);
      }
    });

    // 3. Process Kontak Schedules (Optional follow-up alerts)
    kontakSchedules.forEach(ks => {
      if (!ks.date || !ks.time) return;
      const eventDate = new Date(`${ks.date}T${ks.time}:00`);
      if (isNaN(eventDate.getTime())) return;

      const diffMs = eventDate.getTime() - now;
      const diffMinutes = Math.round(diffMs / 60000);

      const alertItem: UpcomingAlert = {
        id: `kontak-${ks.id}`,
        source: 'kontak',
        title: ks.title || 'Follow-up Kontak Daris',
        category: 'Follow-up Kontak',
        date: ks.date,
        time: ks.time,
        diffMinutes,
        description: ks.description,
        rawEvent: ks
      };

      if (diffMinutes >= -15 && diffMinutes <= 60) {
        withinHour.push(alertItem);
      } else if (diffMinutes > 60 && diffMinutes <= 24 * 60) {
        todayList.push(alertItem);
      }
    });

    // If simulation active, add to withinHour
    if (simulatedAlert) {
      withinHour.unshift(simulatedAlert);
    }

    // Sort ascending by diffMinutes (soonest first)
    withinHour.sort((a, b) => a.diffMinutes - b.diffMinutes);
    todayList.sort((a, b) => a.diffMinutes - b.diffMinutes);

    return { alertsWithinHour: withinHour, upcomingToday: todayList };
  }, [schedules, agendaEvents, kontakSchedules, groups, user, currentTime, simulatedAlert]);

  // Audio chime when a new alert within 1 hour appears
  useEffect(() => {
    if (!soundEnabled) return;
    alertsWithinHour.forEach(alert => {
      if (!chimedAlertIdsRef.current.has(alert.id) && !dismissedIds.has(alert.id)) {
        chimedAlertIdsRef.current.add(alert.id);
        playChimeSound();
      }
    });
  }, [alertsWithinHour, soundEnabled, dismissedIds]);

  // Active toast alert is the first non-dismissed alert within hour
  const activeToastAlert = alertsWithinHour.find(a => !dismissedIds.has(a.id)) || null;

  const dismissAlert = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const handleOpenDetailModal = (alert: UpcomingAlert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const handleTriggerSimulation = (type: 'rapat' | 'kajian') => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const nowObj = new Date();
    // 45 minutes from now
    const targetObj = new Date(nowObj.getTime() + 45 * 60000);
    const dateStr = `${targetObj.getFullYear()}-${pad(targetObj.getMonth() + 1)}-${pad(targetObj.getDate())}`;
    const timeStr = `${pad(targetObj.getHours())}:${pad(targetObj.getMinutes())}`;

    if (type === 'rapat') {
      const mockAlert: UpcomingAlert = {
        id: 'simulated-rapat-' + Date.now(),
        source: 'agenda',
        title: "Rapat Koordinasi & Liqo' Evaluasi Pembina",
        category: 'Liqo / Rapat',
        date: dateStr,
        time: timeStr,
        diffMinutes: 45,
        meetingMode: 'Online',
        location: 'https://meet.google.com/abc-halaqoh-pro',
        description: 'Pembahasan persiapan kurikulum halaqoh pekan depan dan evaluasi kehadiran daris.',
        invitedList: ['Ustadz Teguh', 'Ustadz Margo', 'Ustadz Ahmad Surya']
      };
      setSimulatedAlert(mockAlert);
    } else {
      const mockAlert: UpcomingAlert = {
        id: 'simulated-kajian-' + Date.now(),
        source: 'kajian',
        title: 'Kajian Rutin Daris - Bab Makna Rejeki & Tawakkal',
        category: 'Kajian Pekanan',
        date: dateStr,
        time: timeStr,
        diffMinutes: 45,
        meetingMode: 'Offline',
        location: 'Masjid Jami At-Taqwa (Ruang Belakang)',
        description: 'Materi kajian pertemuan ke-14, dilanjutkan sesi tanya jawab dan setoran hafalan daris.',
        groupOrTarget: 'Kelompok Ustadz Teguh'
      };
      setSimulatedAlert(mockAlert);
    }

    // Play chime sound immediately
    if (soundEnabled) {
      playChimeSound();
    }
  };

  const getDiffText = (minutes: number) => {
    if (minutes > 0) {
      if (minutes === 1) return 'Dimulai dalam 1 menit!';
      return `Dimulai dalam ${minutes} menit`;
    } else if (minutes === 0) {
      return 'Dimulai sekarang!';
    } else {
      return `Sedang berlangsung (${Math.abs(minutes)} mnt lalu)`;
    }
  };

  const isOnlineLink = (loc?: string) => {
    if (!loc) return false;
    return loc.startsWith('http://') || loc.startsWith('https://');
  };

  return (
    <>
      {/* 1. FLOATING TOAST NOTIFICATION BANNER (Top-Right) */}
      {activeToastAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-amber-400 p-4 text-slate-800 transition-all hover:shadow-amber-200/50">
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 animate-bounce text-amber-600" />
                  Peringatan Jadwal (&lt; 1 Jam)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSound}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-[11px]"
                  title={soundEnabled ? 'Matikan Suara Chime' : 'Aktifkan Suara Chime'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <button
                  onClick={(e) => dismissAlert(activeToastAlert.id, e)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  title="Tutup Notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Event Body */}
            <div 
              className="cursor-pointer group"
              onClick={() => handleOpenDetailModal(activeToastAlert)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                    {activeToastAlert.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {activeToastAlert.category}
                    </span>
                    {activeToastAlert.meetingMode && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        activeToastAlert.meetingMode === 'Online'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {activeToastAlert.meetingMode === 'Online' ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                        {activeToastAlert.meetingMode}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shadow-2xs">
                    {activeToastAlert.time}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1">
                    {activeToastAlert.diffMinutes > 0 ? `${activeToastAlert.diffMinutes} mnt lagi` : 'Sekarang'}
                  </div>
                </div>
              </div>

              {/* Time Countdown Text */}
              <div className="mt-2.5 bg-amber-50/70 p-2 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {getDiffText(activeToastAlert.diffMinutes)}
                </span>
                <span className="text-[11px] text-amber-700 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Detail <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
              {activeToastAlert.meetingMode === 'Online' && isOnlineLink(activeToastAlert.location) ? (
                <a
                  href={activeToastAlert.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-xs shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  Masuk Link Rapat
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenDetailModal(activeToastAlert)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Buka Detail Jadwal
                </button>
              )}

              <button
                type="button"
                onClick={(e) => dismissAlert(activeToastAlert.id, e)}
                className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 font-semibold rounded-lg transition text-xs border border-slate-200"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FULL NOTIFICATION CENTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-5 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Pusat Peringatan & Jadwal Terdekat
                    {alertsWithinHour.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                        {alertsWithinHour.length} Mendekati
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Peringatan otomatis jadwal kajian atau rapat yang akan dimulai dalam 1 jam
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSound}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition"
                  title="Pengaturan Suara Notifikasi"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Suara On</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      <span>Suara Mute</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedAlert(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* If Single Alert is Selected for Inspection */}
            {selectedAlert ? (
              <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    ← Kembali ke Semua Peringatan
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {getDiffText(selectedAlert.diffMinutes)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 mb-1">
                        {selectedAlert.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{selectedAlert.title}</h4>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-amber-600">{selectedAlert.time} WIB</div>
                      <div className="text-xs text-slate-500">{selectedAlert.date}</div>
                    </div>
                  </div>

                  {selectedAlert.groupOrTarget && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Grup / Target: </span>
                      {selectedAlert.groupOrTarget}
                    </div>
                  )}

                  {selectedAlert.meetingMode && (
                    <div className="text-xs flex items-center gap-1.5 text-slate-700">
                      <span className="font-semibold">Mode Kegiatan:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                        selectedAlert.meetingMode === 'Online'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedAlert.meetingMode === 'Online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {selectedAlert.meetingMode}
                      </span>
                    </div>
                  )}

                  {selectedAlert.location && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                        {selectedAlert.meetingMode === 'Online' ? <Video className="w-3.5 h-3.5 text-blue-600" /> : <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                        {selectedAlert.meetingMode === 'Online' ? 'Tautan Meeting Online:' : 'Lokasi Acara:'}
                      </div>
                      {isOnlineLink(selectedAlert.location) ? (
                        <a
                          href={selectedAlert.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline break-all font-medium inline-flex items-center gap-1"
                        >
                          {selectedAlert.location}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <div className="text-slate-700 font-medium">{selectedAlert.location}</div>
                      )}
                    </div>
                  )}

                  {selectedAlert.invitedList && selectedAlert.invitedList.length > 0 && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Peserta Diundang: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedAlert.invitedList.map((name, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px]">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAlert.description && (
                    <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
                      <span className="font-semibold text-amber-900 block mb-0.5">Catatan / Deskripsi Agenda:</span>
                      {selectedAlert.description}
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  {selectedAlert.source === 'agenda' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        if (onNavigateToProgress && selectedAlert.rawEvent) {
                          onNavigateToProgress(selectedAlert.rawEvent);
                        } else {
                          onNavigate('agenda-progress');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Catat Presensi / Liqo
                    </button>
                  )}

                  {selectedAlert.source === 'kajian' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        onNavigate('progress');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Catat Presensi Kajian
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      if (selectedAlert.source === 'agenda') onNavigate('agenda-calendar');
                      else if (selectedAlert.source === 'kajian') onNavigate('calendar');
                      else onNavigate('kontak-calendar');
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Buka di Kalender
                  </button>
                </div>
              </div>
            ) : (
              /* All Alerts List */
              <div className="flex flex-col gap-4">
                {/* 1. SECTION: Dimulai dalam 1 Jam */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Jadwal Dimulai Dalam &lt; 1 Jam ({alertsWithinHour.length})
                    </span>
                    {alertsWithinHour.length > 0 && (
                      <span className="text-[11px] text-amber-600 font-semibold">Prioritas Utama</span>
                    )}
                  </div>

                  {alertsWithinHour.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                      Tidak ada jadwal kajian atau rapat yang akan dimulai dalam 1 jam ke depan.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {alertsWithinHour.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3.5 bg-amber-50/60 hover:bg-amber-50 rounded-xl border border-amber-300 transition shadow-2xs flex flex-col gap-2 cursor-pointer group"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                                  {alert.category}
                                </span>
                                <span className="text-xs font-bold text-amber-800">
                                  {getDiffText(alert.diffMinutes)}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
                                {alert.title}
                              </h4>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-amber-700 bg-white px-2 py-1 rounded border border-amber-200">
                                {alert.time}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">{alert.date}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-amber-200/50">
                            <span className="truncate max-w-[320px]">
                              {alert.meetingMode ? `${alert.meetingMode}: ${alert.location || 'Lokasi belum diisi'}` : (alert.groupOrTarget || alert.description || 'Kajian terjadwal')}
                            </span>
                            <span className="font-bold text-emerald-700 text-[11px] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              Lihat Detail <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SECTION: Jadwal Lainnya Hari Ini (24 Jam ke Depan) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Jadwal Lainnya Hari Ini / Mendatang ({upcomingToday.length})
                    </span>
                  </div>

                  {upcomingToday.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Tidak ada agenda lain yang terjadwal untuk hari ini.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                      {upcomingToday.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-2.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition text-xs flex items-center justify-between gap-3 cursor-pointer"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {alert.category}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{alert.title}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {alert.date} • {alert.meetingMode || alert.groupOrTarget || 'Kajian'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {alert.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. SIMULASI / UJI COBA NOTIFIKASI */}
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Uji Coba & Simulasi Notifikasi 1 Jam
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Simulasikan jadwal rapat atau kajian 45 menit lagi untuk menguji Toast peringatan dan audio chime.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTriggerSimulation('rapat')}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-[11px] shadow-2xs"
                    >
                      + Tes Rapat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerSimulation('kajian')}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition text-[11px] shadow-2xs"
                    >
                      + Tes Kajian
                    </button>
                    {simulatedAlert && (
                      <button
                        type="button"
                        onClick={() => setSimulatedAlert(null)}
                        className="px-2 py-1.5 text-red-600 hover:bg-red-50 font-bold rounded-lg transition text-[11px]"
                        title="Hapus Simulasi"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400">
                Peringatan aktif diperbarui otomatis tiap 30 detik
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedAlert(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
