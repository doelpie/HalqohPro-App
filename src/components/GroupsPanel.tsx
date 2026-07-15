import React, { useState, useEffect } from 'react';
import { Group, User } from '../types';

export default function GroupsPanel({ groups, refresh, user }: { groups: Group[], refresh: () => void, user: User }) {
  const [newUstadz, setNewUstadz] = useState(user.role === 'Ustadz' ? user.ustadzName : '');
  const [newStudents, setNewStudents] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editUstadz, setEditUstadz] = useState('');
  const [editStudents, setEditStudents] = useState('');

  // Filter groups based on role
  const displayedGroups = user.role === 'Super Administrator' ? groups : groups.filter(g => g.ustadz === user.ustadzName);

  const addGroup = async () => {
    if (!newUstadz) return;
    const students = newStudents.split(',').map(s => s.trim()).filter(s => s);
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ustadz: newUstadz, students })
    });
    if (user.role === 'Super Administrator') setNewUstadz('');
    setNewStudents('');
    refresh();
  };

  const startEdit = (group: Group) => {
    setEditingGroupId(group.id);
    setEditUstadz(group.ustadz);
    setEditStudents(group.students.join(', '));
  };

  const saveEdit = async (id: string) => {
    const students = editStudents.split(',').map(s => s.trim()).filter(s => s);
    await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ustadz: editUstadz, students })
    });
    setEditingGroupId(null);
    refresh();
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Manajemen Kelompok</h2>
        <div className="text-sm text-slate-500 font-medium">Total: {displayedGroups.length} Kelompok Halaqoh</div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col mb-4">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Kelompok</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ustadz</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
              value={newUstadz}
              onChange={e => setNewUstadz(e.target.value)}
              placeholder="e.g. Ustadz Fulan"
              disabled={user.role === 'Ustadz'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelajar (Pisahkan dengan koma)</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
              value={newStudents}
              onChange={e => setNewStudents(e.target.value)}
              placeholder="e.g. Ali, Budi, Umar"
            />
          </div>
        </div>
        <button 
          onClick={addGroup}
          className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors w-fit"
        >
          Tambahkan Kelompok
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedGroups.map((group, i) => {
          const bgColors = ['bg-emerald-50', 'bg-blue-50', 'bg-amber-50', 'bg-indigo-50'];
          const textColors = ['text-emerald-700', 'text-blue-700', 'text-amber-700', 'text-indigo-700'];
          const colIdx = i % 4;

          const isEditing = editingGroupId === group.id;

          return (
            <div key={group.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col relative transition-all">
              {isEditing ? (
                <div className="flex flex-col h-full space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Ustadz</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={editUstadz}
                      onChange={e => setEditUstadz(e.target.value)}
                      disabled={user.role === 'Ustadz'}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pelajar (Pisahkan koma)</label>
                    <textarea
                      className="w-full h-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 text-sm resize-none"
                      value={editStudents}
                      onChange={e => setEditStudents(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <button onClick={() => saveEdit(group.id)} className="flex-1 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-md hover:bg-emerald-700 transition">Simpan</button>
                    <button onClick={cancelEdit} className="flex-1 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-md hover:bg-slate-200 transition">Batal</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`${bgColors[colIdx]} ${textColors[colIdx]} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter`}>
                      Ustadz {group.ustadz}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-slate-400">ID: {group.id.slice(0, 4).toUpperCase()}</div>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">Kelompok {group.ustadz}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {group.students.map((student, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-slate-100 rounded-md text-slate-600 font-medium">
                        {student}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-end text-xs">
                    <button onClick={() => startEdit(group)} className="text-emerald-600 font-bold hover:underline">Edit Kelompok</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
