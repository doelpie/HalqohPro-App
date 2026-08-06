import React, { useState } from 'react';
import { Group, User, Student, Ustadz } from '../types';
import { Plus, X, UserPlus, Trash2 } from 'lucide-react';

export default function GroupsPanel({ 
  groups, 
  students,
  ustadzList,
  refresh, 
  user,
  changeTab
}: { 
  groups: Group[], 
  students: Student[],
  ustadzList: Ustadz[],
  refresh: () => void, 
  user: User,
  changeTab: (tab: any) => void
}) {
  const [newUstadz, setNewUstadz] = useState(user.role === 'Ustadz' ? user.ustadzName : '');
  const [newStudents, setNewStudents] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editUstadz, setEditUstadz] = useState('');
  const [editStudents, setEditStudents] = useState<string[]>([]);
  
  const [studentSelect, setStudentSelect] = useState('');
  const [editStudentSelect, setEditStudentSelect] = useState('');

  // Filter groups based on role
  const displayedGroups = user.role === 'Super Administrator' ? groups : groups.filter(g => g.ustadz === user.ustadzName);

  const getAvailableStudents = (currentGroupStudents: string[] = []) => {
    return students.filter(student => {
      if (currentGroupStudents.includes(student.name)) return false;

      if (user.role === 'Super Administrator') return true;

      if (student.createdBy !== user.ustadzName) return false;

      const isInOtherGroup = groups.some(g => g.ustadz !== user.ustadzName && g.students.includes(student.name));
      if (isInOtherGroup) return false;

      return true;
    });
  };

  const addGroup = async () => {
    if (!newUstadz) return alert('Pilih Ustadz terlebih dahulu');
    if (newStudents.length === 0) return alert('Pilih minimal satu pelajar');
    
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ustadz: newUstadz, students: newStudents })
    });
    if (user.role === 'Super Administrator') setNewUstadz('');
    setNewStudents([]);
    refresh();
  };

  const startEdit = (group: Group) => {
    setEditingGroupId(group.id);
    setEditUstadz(group.ustadz);
    setEditStudents([...group.students]);
    setEditStudentSelect('');
  };

  const saveEdit = async (id: string) => {
    if (!editUstadz) return alert('Pilih Ustadz terlebih dahulu');
    if (editStudents.length === 0) return alert('Pilih minimal satu pelajar');

    await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ustadz: editUstadz, students: editStudents })
    });
    setEditingGroupId(null);
    refresh();
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kelompok ini?')) return;
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Manajemen Kelompok</h2>
        <div className="text-sm text-slate-500 font-medium">Total: {displayedGroups.length} Kelompok Halaqoh</div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col mb-4">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Kelompok</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ustadz</label>
            <div className="flex gap-2">
              <select 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                value={newUstadz}
                onChange={e => setNewUstadz(e.target.value)}
                disabled={user.role === 'Ustadz'}
              >
                <option value="">-- Pilih Ustadz --</option>
                {ustadzList.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
              {user.role === 'Super Administrator' && (
                <button 
                  onClick={() => changeTab('ustadz')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center whitespace-nowrap"
                  title="Tambah Ustadz Baru"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tambahkan Pelajar</label>
            <div className="flex gap-2 mb-3">
              <select 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                value={studentSelect}
                onChange={e => {
                  if (e.target.value && !newStudents.includes(e.target.value)) {
                    setNewStudents([...newStudents, e.target.value]);
                  }
                  setStudentSelect('');
                }}
              >
                <option value="">-- Pilih Pelajar --</option>
                {getAvailableStudents(newStudents).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button 
                onClick={() => changeTab('students')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center whitespace-nowrap"
                title="Tambah Pelajar Baru"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {newStudents.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Nama Pelajar</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {newStudents.map((student, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{student}</td>
                        <td className="px-3 py-2 text-right">
                          <button 
                            onClick={() => setNewStudents(newStudents.filter(s => s !== student))}
                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={addGroup}
          className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors w-fit"
        >
          Tambahkan Kelompok
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayedGroups.map((group, i) => {
          const bgColors = ['bg-emerald-50', 'bg-blue-50', 'bg-amber-50', 'bg-indigo-50'];
          const textColors = ['text-emerald-700', 'text-blue-700', 'text-amber-700', 'text-indigo-700'];
          const colIdx = i % 4;

          const isEditing = editingGroupId === group.id;

          return (
            <div key={group.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col relative transition-all">
              {isEditing ? (
                <div className="flex flex-col h-full space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Ustadz</label>
                    <select
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={editUstadz}
                      onChange={e => setEditUstadz(e.target.value)}
                      disabled={user.role === 'Ustadz'}
                    >
                      <option value="">-- Pilih Ustadz --</option>
                      {ustadzList.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Daftar Pelajar</label>
                    <div className="flex gap-2 mb-2">
                      <select 
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                        value={editStudentSelect}
                        onChange={e => {
                          if (e.target.value && !editStudents.includes(e.target.value)) {
                            setEditStudents([...editStudents, e.target.value]);
                          }
                          setEditStudentSelect('');
                        }}
                      >
                        <option value="">-- Tambah Pelajar --</option>
                        {getAvailableStudents(editStudents).map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="border border-slate-200 rounded-md overflow-hidden max-h-40 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5">Nama Pelajar</th>
                            <th className="px-2 py-1.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {editStudents.length > 0 ? (
                            editStudents.map((student, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-1.5">{student}</td>
                                <td className="px-2 py-1.5 text-right">
                                  <button 
                                    onClick={() => setEditStudents(editStudents.filter(s => s !== student))}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="px-2 py-2 text-center text-slate-400">Belum ada pelajar</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
                      <span key={idx} className="text-xs px-2 py-1 bg-slate-100 rounded-md text-slate-600 font-medium border border-slate-200">
                        {student}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-end text-xs gap-3">
                    <button onClick={() => startEdit(group)} className="text-emerald-600 font-bold hover:underline">Edit Kelompok</button>
                    {user.role === 'Super Administrator' && (
                      <button onClick={() => handleDelete(group.id)} className="text-red-500 font-bold hover:underline">Hapus</button>
                    )}
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
