/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import GroupsPanel from './components/GroupsPanel';
import MaterialsPanel from './components/MaterialsPanel';
import ProgressPanel from './components/ProgressPanel';
import SyncPanel from './components/SyncPanel';
import { Group, Material, Progress } from './types';
import { BookOpen, Users, Settings, Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'progress' | 'groups' | 'materials' | 'sync'>('progress');
  const [data, setData] = useState<{ groups: Group[], materials: Material[], progress: Progress[] } | null>(null);

  const loadData = async () => {
    const res = await fetch('/api/data');
    const d = await res.json();
    setData(d);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat data...</div>;

  const tabs = [
    { id: 'progress', label: 'Progres', icon: <Activity className="w-4 h-4 mr-2" /> },
    { id: 'groups', label: 'Kelompok', icon: <Users className="w-4 h-4 mr-2" /> },
    { id: 'materials', label: 'Materi', icon: <BookOpen className="w-4 h-4 mr-2" /> },
    { id: 'sync', label: 'Integrasi', icon: <Settings className="w-4 h-4 mr-2" /> },
  ] as const;

  return (
    <div className="h-screen w-full flex overflow-hidden font-sans text-slate-800 bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col border-r border-slate-200 shrink-0">
        <div className="p-6 border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-lg">H</div>
            <h1 className="text-xl font-bold tracking-tight">HalaqohPro</h1>
          </div>
          <p className="text-xs text-emerald-300/70 mt-1 uppercase tracking-widest font-semibold">LMS Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
        <div className="p-4 mt-auto border-t border-emerald-800/50">
          <div className="bg-emerald-800/50 p-4 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-sm">A</div>
            <div>
              <p className="text-xs font-bold text-white">Admin Panel</p>
              <p className="text-[10px] text-emerald-300">Super Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4 text-slate-500">
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-semibold text-emerald-700">Google Sheet Synced</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg relative">
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full text-slate-800">
            {activeTab === 'progress' && <ProgressPanel groups={data.groups} materials={data.materials} progress={data.progress} refresh={loadData} />}
            {activeTab === 'groups' && <GroupsPanel groups={data.groups} refresh={loadData} />}
            {activeTab === 'materials' && <MaterialsPanel materials={data.materials} refresh={loadData} />}
            {activeTab === 'sync' && <SyncPanel />}
          </div>
        </div>

        <footer className="bg-white border-t border-slate-200 p-3 px-8 flex justify-between items-center text-[11px] text-slate-500 font-medium shrink-0">
          <div>Sistem Manajemen Halaqoh v2.4.0</div>
          <div className="flex gap-6">
            <span>Sync Status: Live</span>
            <span className="text-emerald-600">Calendar Integration Active</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
