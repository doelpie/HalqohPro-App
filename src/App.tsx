/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import GroupsPanel from './components/GroupsPanel';
import MaterialsPanel from './components/MaterialsPanel';
import ProgressPanel from './components/ProgressPanel';
import SyncPanel from './components/SyncPanel';
import Login from './components/Login';
import CalendarPanel from './components/CalendarPanel';
import StudentsPanel from './components/StudentsPanel';
import UstadzPanel from './components/UstadzPanel';
import KontakanPanel from './components/KontakanPanel';
import KontakCalendarPanel from './components/KontakCalendarPanel';
import KontakProgressPanel from './components/KontakProgressPanel';
import AgendaCalendarPanel from './components/AgendaCalendarPanel';
import AgendaProgressPanel from './components/AgendaProgressPanel';
import AppSettingsPanel from './components/AppSettingsPanel';
import DashboardPanel from './components/DashboardPanel';
import ChangePasswordModal from './components/ChangePasswordModal';
import NotificationManager from './components/NotificationManager';
import { Group, Material, Progress, Schedule, User, Student, Ustadz, Kontakan, KontakSchedule, KontakProgress, AgendaEvent, AgendaProgress, AppConfig } from './types';
import { BookOpen, Users, Settings, Activity, LogOut, Calendar, Menu, GraduationCap, UserCheck, Key, PhoneCall, CalendarHeart, TrendingUp, Sliders, LayoutDashboard, ChevronDown, ChevronUp, CalendarRange, ClipboardCheck, Bell, BellRing } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'progress' | 'calendar' | 'groups' | 'materials' | 'students' | 'ustadz' | 'sync' | 'kontakan' | 'kontak-calendar' | 'kontak-progress' | 'agenda-calendar' | 'agenda-progress' | 'settings'>('dashboard');
  const [data, setData] = useState<{ groups: Group[], materials: Material[], progress: Progress[], schedules: Schedule[], students: Student[], ustadz: Ustadz[], kontakan: Kontakan[], kontakSchedules: KontakSchedule[], kontakProgress: KontakProgress[], agendaEvents?: AgendaEvent[], agendaProgress?: AgendaProgress[], appConfig?: AppConfig } | null>(null);
  const [agendaPrefill, setAgendaPrefill] = useState<Partial<AgendaEvent> | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    title: 'HalaqohPro',
    subtitle: 'LMS Management',
    logoUrl: '',
    faviconUrl: '',
    footerText: 'Sistem Manajemen Halaqoh v2.4.0'
  });
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
    system: true,
  });

  // Sidebar navigation scroll tracking & state
  const navRef = useRef<HTMLElement | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const checkNavScroll = () => {
    const el = navRef.current;
    if (!el) return;
    const hasMoreDown = el.scrollTop + el.clientHeight < el.scrollHeight - 6;
    const hasMoreUp = el.scrollTop > 6;
    setCanScrollDown(hasMoreDown);
    setCanScrollUp(hasMoreUp);
  };

  const handleScrollDown = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ top: 160, behavior: 'smooth' });
    }
  };

  const handleScrollUp = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ top: -160, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkNavScroll();
    const el = navRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkNavScroll, { passive: true });
    window.addEventListener('resize', checkNavScroll);

    // Also check after a microtask for DOM rendering / expanding
    const timer = setTimeout(checkNavScroll, 100);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', checkNavScroll);
      window.removeEventListener('resize', checkNavScroll);
    };
  }, [collapsedSections, activeTab, user]);

  // Auto-expand section if user activates one of its sub-items
  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'sync') {
      setCollapsedSections(prev => prev.system ? { ...prev, system: false } : prev);
    }
  }, [activeTab]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const loadData = async () => {
    const res = await fetch('/api/data');
    const d = await res.json();
    setData(d);
    if (d.appConfig) {
      setAppConfig(d.appConfig);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update browser document title & favicon dynamically without rebuild
  useEffect(() => {
    if (appConfig.title) {
      document.title = appConfig.title;
    }
    if (appConfig.logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = appConfig.logoUrl;
    }
  }, [appConfig]);

  // Count urgent schedules or meetings starting within 1 hour
  const urgentAlertsCount = useMemo(() => {
    if (!data) return 0;
    const now = Date.now();
    let count = 0;
    (data.schedules || []).forEach(s => {
      if (!s.date || !s.time) return;
      const t = new Date(`${s.date}T${s.time}:00`).getTime();
      if (isNaN(t)) return;
      const diff = Math.round((t - now) / 60000);
      if (diff >= -15 && diff <= 60) count++;
    });
    (data.agendaEvents || []).forEach(ev => {
      if (!ev.date || !ev.time) return;
      const t = new Date(`${ev.date}T${ev.time}:00`).getTime();
      if (isNaN(t)) return;
      const diff = Math.round((t - now) / 60000);
      if (diff >= -15 && diff <= 60) count++;
    });
    return count;
  }, [data]);

  if (!user) {
    return <Login onLogin={setUser} appConfig={appConfig} />;
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat data...</div>;

  const handleLogout = () => setUser(null);

  const initialChar = (appConfig.title || 'HalaqohPro').trim().charAt(0).toUpperCase() || 'H';

  const menuSections = [
    {
      key: 'main',
      title: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
      ]
    },
    {
      key: 'halaqoh',
      title: 'Halaqoh',
      items: [
        { id: 'groups', label: 'Kelompok', icon: <Users className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'students', label: 'Daftar Pelajar', icon: <GraduationCap className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'progress', label: 'Progres Kajian', icon: <Activity className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'calendar', label: 'Kalender Kajian', icon: <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'materials', label: 'Materi Silabus', icon: <BookOpen className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'ustadz', label: 'Daftar Ustadz', icon: <UserCheck className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
      ]
    },
    {
      key: 'kontak',
      title: 'Pembinaan Kontak',
      items: [
        { id: 'kontakan', label: 'Daftar Kontakan', icon: <PhoneCall className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'kontak-calendar', label: 'Kalender Kontak', icon: <CalendarHeart className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'kontak-progress', label: 'Progres Kontak', icon: <TrendingUp className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
      ]
    },
    {
      key: 'agenda',
      title: 'Monitoring Agenda Kegiatan',
      items: [
        { id: 'agenda-calendar', label: 'Kalender Agenda', icon: <CalendarRange className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
        { id: 'agenda-progress', label: "Progres Agenda & Liqo'", icon: <ClipboardCheck className="w-3.5 h-3.5 mr-2 shrink-0" />, show: true },
      ]
    },
    {
      key: 'system',
      title: 'Sistem',
      items: [
        { id: 'settings', label: 'Pengaturan Tampilan', icon: <Sliders className="w-3.5 h-3.5 mr-2 shrink-0" />, show: user.role === 'Super Administrator' },
        { id: 'sync', label: 'Integrasi', icon: <Settings className="w-3.5 h-3.5 mr-2 shrink-0" />, show: user.role === 'Super Administrator' },
      ]
    }
  ];

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden font-sans text-slate-800 bg-[#f8fafc]">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Zero-scroll compact layout */}
      <aside className={`fixed md:static inset-y-0 left-0 w-60 bg-emerald-900 text-white flex flex-col border-r border-slate-200 shrink-0 z-30 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Compact Header Brand */}
        <div 
          onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          className="px-3.5 py-2.5 border-b border-emerald-800/60 cursor-pointer hover:bg-emerald-800/30 transition group flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {appConfig.logoUrl ? (
              <img 
                src={appConfig.logoUrl} 
                alt={appConfig.title || 'Logo'} 
                className="w-7 h-7 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20 shrink-0 shadow-xs group-hover:scale-105 transition" 
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs group-hover:scale-105 transition">
                {initialChar}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold tracking-tight truncate text-white leading-tight">
                {appConfig.title || 'HalaqohApp'}
              </h1>
              <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider font-semibold truncate leading-tight mt-0.5">
                {appConfig.subtitle || 'Dakwah Management System'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Container with zero scrollbar, gradient fades & animated scroll indicator */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Top gradient shadow fade when scrolled down */}
          <div
            className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-emerald-900 via-emerald-900/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
              canScrollUp ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Compact Categorized Navigation - hidden native scrollbar */}
          <nav
            ref={navRef}
            onScroll={checkNavScroll}
            className="flex-1 px-2.5 py-1.5 space-y-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col justify-start"
          >
            {menuSections.map(section => {
              const visibleItems = section.items.filter(item => item.show);
              if (visibleItems.length === 0) return null;
              const isCollapsed = !!collapsedSections[section.key];

              return (
                <div key={section.key} className="space-y-0.5">
                  {section.title && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center justify-between px-2 pt-2 pb-1 text-[10px] font-bold text-emerald-400/80 hover:text-emerald-200 uppercase tracking-wider transition-all duration-200 group cursor-pointer select-none"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">{section.title}</span>
                      <ChevronDown className={`w-3 h-3 text-emerald-400/60 group-hover:text-emerald-200 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  )}

                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {visibleItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id as any);
                              setIsSidebarOpen(false);
                            }}
                            className={`group relative w-full flex items-center px-2.5 py-1.5 rounded-lg text-xs text-left transition-all duration-200 ease-out cursor-pointer ${
                              isActive
                                ? 'bg-gradient-to-r from-emerald-700 via-emerald-700/95 to-emerald-800 text-white font-semibold shadow-xs translate-x-1.5 pl-3 border-l-2 border-emerald-300'
                                : 'text-emerald-100/85 hover:text-white hover:bg-emerald-800/70 hover:translate-x-1.5 hover:shadow-2xs'
                            }`}
                          >
                            <span className={`transition-transform duration-200 flex items-center shrink-0 ${isActive ? 'scale-105 text-emerald-200' : 'text-emerald-300/80 group-hover:scale-110 group-hover:text-emerald-200'}`}>
                              {item.icon}
                            </span>
                            <span className="truncate flex-1 tracking-tight">{item.label}</span>
                            
                            {isActive ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)] animate-pulse shrink-0 ml-1.5" />
                            ) : (
                              <span className="opacity-0 -translate-x-1 group-hover:opacity-75 group-hover:translate-x-0 transition-all duration-200 text-emerald-300 text-[10px] shrink-0 ml-1">
                                ›
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom gradient shadow fade when there is more content below */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-emerald-900 via-emerald-900/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
              canScrollDown ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Attractive Floating Down Arrow Button */}
          {canScrollDown && (
            <div className="absolute bottom-2 left-0 right-0 px-3 flex justify-center pointer-events-none z-20">
              <button
                type="button"
                onClick={handleScrollDown}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[11px] font-bold shadow-lg shadow-emerald-950/60 border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer animate-bounce-slow"
                title="Scroll ke menu di bawah"
              >
                <span>Scroll ke Bawah</span>
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
                  <ChevronDown className="w-3 h-3 text-white transition-transform duration-200 group-hover:translate-y-0.5" />
                </div>
              </button>
            </div>
          )}

          {/* Floating Up Arrow Button (when reached bottom and can scroll back up) */}
          {!canScrollDown && canScrollUp && (
            <div className="absolute bottom-2 left-0 right-0 px-3 flex justify-center pointer-events-none z-20">
              <button
                type="button"
                onClick={handleScrollUp}
                className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-800/90 hover:bg-emerald-700 text-emerald-200 hover:text-white text-[10px] font-semibold shadow-md border border-emerald-700/60 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer"
                title="Kembali ke menu atas"
              >
                <ChevronUp className="w-3 h-3 text-emerald-300 transition-transform duration-200 group-hover:-translate-y-0.5" />
                <span>Kembali Ke Atas</span>
              </button>
            </div>
          )}
        </div>

        {/* Compact User Profile Box at bottom */}
        <div className="p-2 mt-auto border-t border-emerald-800/60 shrink-0">
          <div className="bg-emerald-800/50 p-2 rounded-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-[11px] text-white shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{user.username}</p>
              <p className="text-[10px] text-emerald-300/90 truncate leading-tight">{user.role}</p>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="text-emerald-300 hover:text-white transition shrink-0 p-1 hover:bg-emerald-700/60 rounded" 
              title="Ganti Password"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleLogout} 
              className="text-emerald-300 hover:text-white transition shrink-0 p-1 hover:bg-emerald-700/60 rounded" 
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3 text-slate-500">
            <button 
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Header Brand for Mobile */}
            <div 
              onClick={() => setActiveTab('dashboard')} 
              className="flex md:hidden items-center gap-2 cursor-pointer hover:opacity-80 transition"
            >
              {appConfig.logoUrl ? (
                <img src={appConfig.logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-contain p-0.5 border border-slate-200 shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {initialChar}
                </div>
              )}
              <span className="font-bold text-slate-800 text-sm truncate max-w-[130px]">
                {appConfig.title || 'HalaqohPro'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-semibold text-emerald-700">Google Sheet Synced</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Header Brand Pill for Desktop */}
            <div 
              onClick={() => setActiveTab('dashboard')} 
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 cursor-pointer transition"
            >
              {appConfig.logoUrl ? (
                <img src={appConfig.logoUrl} alt="Logo" className="w-5 h-5 rounded object-contain shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                  {initialChar}
                </div>
              )}
              <span className="text-xs font-bold text-slate-700 tracking-tight">
                {appConfig.title || 'HalaqohPro'}
              </span>
            </div>

            <button 
              onClick={() => setIsNotificationModalOpen(true)}
              className={`p-2 rounded-lg relative transition-all ${
                urgentAlertsCount > 0 
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
              title={urgentAlertsCount > 0 ? `Ada ${urgentAlertsCount} jadwal dimulai dalam < 1 jam!` : "Pusat Peringatan & Jadwal"}
            >
              {urgentAlertsCount > 0 ? (
                <>
                  <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                    {urgentAlertsCount}
                  </span>
                  <BellRing className="w-5 h-5 text-amber-700 animate-pulse" />
                </>
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto min-h-full text-slate-800">
            
            {activeTab === 'dashboard' && (
              <DashboardPanel 
                groups={data.groups}
                students={data.students}
                ustadzList={data.ustadz}
                schedules={data.schedules}
                progress={data.progress}
                materials={data.materials}
                kontakan={data.kontakan}
                kontakSchedules={data.kontakSchedules}
                kontakProgress={data.kontakProgress}
                agendaEvents={data.agendaEvents || []}
                agendaProgress={data.agendaProgress || []}
                user={user}
                onNavigate={(tab) => setActiveTab(tab as any)}
              />
            )}
            {activeTab === 'progress' && <ProgressPanel groups={data.groups} materials={data.materials} progress={data.progress} refresh={loadData} user={user} />}
            {activeTab === 'calendar' && <CalendarPanel groups={data.groups} schedules={data.schedules} materials={data.materials} refresh={loadData} user={user} />}
            {activeTab === 'groups' && <GroupsPanel groups={data.groups} students={data.students} ustadzList={data.ustadz} refresh={loadData} user={user} changeTab={setActiveTab} />}
            {activeTab === 'materials' && <MaterialsPanel materials={data.materials} refresh={loadData} user={user} />}
            {activeTab === 'students' && <StudentsPanel students={data.students} groups={data.groups} refresh={loadData} user={user} />}
            {activeTab === 'ustadz' && <UstadzPanel ustadzList={data.ustadz} refresh={loadData} user={user} />}
            {activeTab === 'kontakan' && <KontakanPanel kontakan={data.kontakan} groups={data.groups} refresh={loadData} user={user} />}
            {activeTab === 'kontak-calendar' && <KontakCalendarPanel kontakan={data.kontakan} kontakSchedules={data.kontakSchedules} materials={data.materials} refresh={loadData} user={user} />}
            {activeTab === 'kontak-progress' && <KontakProgressPanel kontakan={data.kontakan} kontakProgress={data.kontakProgress} materials={data.materials} refresh={loadData} user={user} />}
            {activeTab === 'agenda-calendar' && (
              <AgendaCalendarPanel 
                agendaEvents={data.agendaEvents || []} 
                ustadzList={data.ustadz} 
                students={data.students} 
                refresh={loadData} 
                user={user}
                onNavigateToProgress={(prefill) => {
                  setAgendaPrefill(prefill || null);
                  setActiveTab('agenda-progress');
                }}
              />
            )}
            {activeTab === 'agenda-progress' && (
              <AgendaProgressPanel 
                agendaProgress={data.agendaProgress || []} 
                agendaEvents={data.agendaEvents || []} 
                ustadzList={data.ustadz} 
                students={data.students} 
                refresh={loadData} 
                user={user}
                initialPrefill={agendaPrefill}
              />
            )}
            {activeTab === 'settings' && <AppSettingsPanel appConfig={appConfig} onUpdateConfig={setAppConfig} refresh={loadData} user={user} />}
            {activeTab === 'sync' && <SyncPanel />}

          </div>
        </div>

        <footer className="bg-white border-t border-slate-200 p-3 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0 text-[11px] text-slate-500 font-medium shrink-0 text-center md:text-left">
          <div>{appConfig.footerText || 'Sistem Manajemen Halaqoh v2.4.0'}</div>
          <div className="flex gap-4 md:gap-6 flex-wrap justify-center items-center">
            <a 
              href="/privacy-policy.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-emerald-700 hover:underline transition"
            >
              Kebijakan Privasi
            </a>
            <a 
              href="/terms-of-service.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-emerald-700 hover:underline transition"
            >
              Syarat & Ketentuan
            </a>
            <span>Sync Status: Live</span>
            <span className="text-emerald-600">Calendar Integration Active</span>
          </div>
        </footer>
      </main>

      {data && user && (
        <NotificationManager
          schedules={data.schedules}
          agendaEvents={data.agendaEvents || []}
          kontakSchedules={data.kontakSchedules || []}
          groups={data.groups}
          user={user}
          onNavigate={(tab) => setActiveTab(tab as any)}
          onNavigateToProgress={(prefill) => {
            setAgendaPrefill(prefill || null);
            setActiveTab('agenda-progress');
          }}
          isModalOpen={isNotificationModalOpen}
          setIsModalOpen={setIsNotificationModalOpen}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal 
          user={user} 
          onClose={() => setShowPasswordModal(false)} 
        />
      )}
    </div>
  );
}

