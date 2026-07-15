/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import GroupsPanel from './components/GroupsPanel';
import MaterialsPanel from './components/MaterialsPanel';
import ProgressPanel from './components/ProgressPanel';
import SyncPanel from './components/SyncPanel';
import Login from './components/Login';
import CalendarPanel from './components/CalendarPanel';
import { Group, Material, Progress, Schedule, User } from './types';
import { BookOpen, Users, Settings, Activity, LogOut, Calendar, Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'progress' | 'calendar' | 'groups' | 'materials' | 'sync'>('progress');
  const [data, setData] = useState<{ groups: Group[], materials: Material[], progress: Progress[], schedules: Schedule[] } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const loadData = async () => {
    const res = await fetch('/api/data');
    const d = await res.json();
    setData(d);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat data...</div>;

  const handleLogout = () => setUser(null);

  const tabs = [
    { id: 'progress', label: 'Progres', icon: <Activity className="w-4 h-4 mr-2" />, show: true },
    { id: 'calendar', label: 'Kalendar Kajian', icon: <Calendar className="w-4 h-4 mr-2" />, show: true },
    { id: 'groups', label: 'Kelompok', icon: <Users className="w-4 h-4 mr-2" />, show: true },
    { id: 'materials', label: 'Materi', icon: <BookOpen className="w-4 h-4 mr-2" />, show: true },
    { id: 'sync', label: 'Integrasi', icon: <Settings className="w-4 h-4 mr-2" />, show: user.role === 'Super Administrator' },
  ] as const;

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden font-sans text-slate-800 bg-[#f8fafc]">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-emerald-900 text-white flex flex-col border-r border-slate-200 shrink-0 z-30 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-lg">H</div>
            <h1 className="text-xl font-bold tracking-tight">HalaqohPro</h1>
          </div>
          <p className="text-xs text-emerald-300/70 mt-1 uppercase tracking-widest font-semibold">LMS Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.filter(tab => tab.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-800 text-white'
                  : 'text-emerald-100 hover:bg-emerald-800/50'
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-emerald-800/50 space-y-3 shrink-0">
          <div className="bg-emerald-800/50 p-4 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">{user.username.charAt(0).toUpperCase()}</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.username}</p>
              <p className="text-[10px] text-emerald-300 truncate">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="text-emerald-300 hover:text-white transition shrink-0 p-1" title="Logout">
              <LogOut className="w-4 h-4" />
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
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-semibold text-emerald-700">Google Sheet Synced</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg relative transition-colors">
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto min-h-full text-slate-800">
            {activeTab === 'progress' && <ProgressPanel groups={data.groups} materials={data.materials} progress={data.progress} refresh={loadData} user={user} />}
            {activeTab === 'calendar' && <CalendarPanel groups={data.groups} schedules={data.schedules} refresh={loadData} user={user} />}
            {activeTab === 'groups' && <GroupsPanel groups={data.groups} refresh={loadData} user={user} />}
            {activeTab === 'materials' && <MaterialsPanel materials={data.materials} refresh={loadData} user={user} />}
            {activeTab === 'sync' && <SyncPanel />}
          </div>
        </div>

        <footer className="bg-white border-t border-slate-200 p-3 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0 text-[11px] text-slate-500 font-medium shrink-0 text-center md:text-left">
          <div>Sistem Manajemen Halaqoh v2.4.0</div>
          <div className="flex gap-4 md:gap-6 flex-wrap justify-center">
            <span>Sync Status: Live</span>
            <span className="text-emerald-600">Calendar Integration Active</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
