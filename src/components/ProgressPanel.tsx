import React, { useState, useRef } from 'react';
import { Group, Material, Progress, User } from '../types';
import { Download, Upload, FileText } from 'lucide-react';
import { downloadCSV, parseCSV } from '../utils/csv';

export default function ProgressPanel({ groups, materials, progress, refresh, user }: { groups: Group[], materials: Material[], progress: Progress[], refresh: () => void, user: User }) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const [date, setDate] = useState('');
  const [attendance, setAttendance] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // CSV States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const displayedGroups = user.role === 'Super Administrator' ? groups : groups.filter(g => g.ustadz === user.ustadzName);
  const displayedProgress = user.role === 'Super Administrator' 
    ? progress 
    : progress.filter(p => {
        const g = groups.find(x => x.id === p.groupId);
        return g?.ustadz === user.ustadzName;
      });

  const group = groups.find(g => g.id === selectedGroup);

  const handleToggleAttendance = (student: string) => {
    setAttendance(prev => 
      prev.includes(student) ? prev.filter(s => s !== student) : [...prev, student]
    );
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroup(e.target.value);
    setAttendance([]);
  };

  const saveProgress = async () => {
    if (!selectedGroup || !selectedMeeting || !date) return alert('Mohon lengkapi form');
    const selectedMat = materials.find(m => m.meeting === parseInt(selectedMeeting));
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: selectedGroup,
        meeting: parseInt(selectedMeeting),
        materialId: selectedMat?.id,
        date,
        attendance,
        notes
      })
    });
    // Add to Calendar Integration could be triggered here or separately
    try {
      const materialTitle = selectedMat?.title;
      await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Halaqoh: ${group?.ustadz} - ${materialTitle}`,
          date,
          description: `Pertemuan ini membahas: ${materialTitle}\nKehadiran: ${attendance.join(', ')}\nCatatan: ${notes}`
        })
      });
      alert('Tersimpan & Ditambahkan ke Google Calendar (jika terhubung).');
    } catch (err) {
      alert('Tersimpan di local, tapi belum sync kalender.');
    }
    
    setSelectedGroup('');
    setSelectedMeeting('');
    setDate('');
    setAttendance([]);
    setNotes('');
    refresh();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (displayedProgress.length === 0) return alert('Tidak ada data progress kajian untuk diexport');
    const headers = ['Ustadz', 'ID Kelompok', 'Pertemuan Ke', 'Materi', 'Tanggal', 'Kehadiran Daris', 'Catatan'];
    const rows = displayedProgress.map(p => {
      const g = groups.find(x => x.id === p.groupId);
      const m = materials.find(x => x.meeting === p.meeting);
      return [
        g?.ustadz || '',
        p.groupId,
        p.meeting.toString(),
        m?.title || '',
        p.date,
        p.attendance.join('; '),
        p.notes || ''
      ];
    });
    downloadCSV('Progress_Presensi_Kajian.csv', headers, rows);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['ID Kelompok (atau Nama Ustadz)', 'Pertemuan Ke', 'Tanggal (YYYY-MM-DD HH:mm)', 'Kehadiran Daris (pisahkan titik koma)', 'Catatan'];
    const exampleUstadz = groups[0]?.ustadz || 'Abdullah';
    const exampleGroupId = groups[0]?.id || 'group-1';
    const exampleRows = [
      [exampleGroupId, '1', '2026-04-10 16:00', 'Muhammad Fatih; Ahmad Zaki', 'Pembahasan rukun iman berlangsung khidmat'],
      [exampleUstadz, '2', '2026-04-17 16:00', 'Muhammad Fatih', 'Tadabbur surat Al-Fatihah']
    ];
    downloadCSV('Template_Import_Progress_Kajian.csv', headers, exampleRows);
  };

  // CSV Import
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

      const parsed: Progress[] = [];
      for (const r of rows) {
        const groupIdentifier = (r[0] || '').trim();
        const meetingNum = parseInt(r[1] || '1', 10);
        const pDate = (r[2] || '').trim();
        const attStr = r[3] || '';
        const pNotes = r[4] || '';

        // Match group by id or by ustadz name
        const foundGroup = groups.find(g => g.id === groupIdentifier || g.ustadz.toLowerCase() === groupIdentifier.toLowerCase());
        const targetGroupId = foundGroup ? foundGroup.id : (groups[0]?.id || 'default-group');

        const attendanceList = attStr.split(';').map(s => s.trim()).filter(Boolean);

        if (pDate) {
          parsed.push({
            id: 'prog-' + Math.random().toString(36).substr(2, 9),
            groupId: targetGroupId,
            meeting: isNaN(meetingNum) ? 1 : meetingNum,
            date: pDate,
            attendance: attendanceList,
            notes: pNotes
          });
        }
      }

      if (parsed.length === 0) {
        alert('Tidak ditemukan data progress kajian yang valid pada file CSV');
        return;
      }
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmCSVImport = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'progress', items: csvPreview })
      });
      if (res.ok) {
        setCsvPreview(null);
        refresh();
        alert(`Berhasil mengimpor ${csvPreview.length} data progress kajian!`);
      } else {
        alert('Gagal mengimpor data ke server');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden file input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCSVSelect}
        accept=".csv,text/csv"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Progress & Presensi Kajian</h2>
          <p className="text-slate-500 text-sm">Pencatatan materi kajian dan rekap presensi daris</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Download Template CSV"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Template CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition"
            title="Import CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Catat Progres Pertemuan</h3>
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kelompok</label>
            <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={selectedGroup} onChange={handleGroupChange}>
              <option value="">Pilih Kelompok</option>
              {displayedGroups.map(g => (
                <option key={g.id} value={g.id}>Kelompok {g.ustadz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Materi</label>
            <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={selectedMeeting} onChange={e => setSelectedMeeting(e.target.value)}>
              <option value="">Pilih Materi</option>
              {materials.map(m => (
                <option key={m.id} value={m.meeting}>Pertemuan {m.meeting}: {m.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu Kajian</label>
            <input type="datetime-local" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {group && (
          <div className="mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Presensi (Centang yang hadir)</label>
            <div className="flex flex-wrap gap-4">
              {group.students.map(student => (
                <label key={student} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-emerald-600 rounded border-slate-300" checked={attendance.includes(student)} onChange={() => handleToggleAttendance(student)} />
                  <span className="text-sm font-medium text-slate-800">{student}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Catatan</label>
          <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tambahkan catatan singkat..."></textarea>
        </div>

        <button onClick={saveProgress} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center rounded-lg shadow-sm transition-colors text-sm w-fit mt-2">
          Simpan & Jadwalkan Kalender
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 p-5 border-b border-slate-200 uppercase tracking-wider">Riwayat Kajian</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kelompok</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pertemuan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedProgress.slice().reverse().map(p => {
                const g = groups.find(x => x.id === p.groupId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-800 font-bold">Ustadz {g?.ustadz || 'Unknown'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(p.date).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700 text-center">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs">Ke-{p.meeting.toString().padStart(2, '0')}</span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-emerald-600">{p.attendance.length} / {g?.students.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <h3 className="text-sm font-bold text-slate-800 p-5 border-b border-slate-200 uppercase tracking-wider">Progres Tiap Kelompok</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-5 gap-4">
          {displayedGroups.map(group => {
            const groupProgress = progress.filter(p => p.groupId === group.id);
            const latestMeeting = groupProgress.length > 0 ? Math.max(...groupProgress.map(p => p.meeting)) : 0;
            const totalMeetings = materials.length;
            const progressPercent = totalMeetings > 0 ? (latestMeeting / totalMeetings) * 100 : 0;
            const latestMaterial = materials.find(m => m.meeting === latestMeeting)?.title || 'Belum Ada';

            return (
              <div key={group.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-800 text-sm">Kelompok Ustadz {group.ustadz}</h4>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                    Pertemuan {latestMeeting}/{totalMeetings}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 font-medium">Materi Terakhir: <span className="text-slate-700">{latestMaterial}</span></p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSV Preview Modal */}
      {csvPreview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Import CSV Progress Kajian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{csvPreview.length} data laporan kajian</strong> yang siap dimasukkan ke sistem.
                </p>
              </div>
              <button 
                onClick={() => setCsvPreview(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {csvPreview.map((p, idx) => {
                const g = groups.find(x => x.id === p.groupId);
                return (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{idx + 1}. Kelompok Ustadz {g?.ustadz || p.groupId}</span>
                      <span className="font-semibold text-slate-600">Pertemuan {p.meeting}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Waktu: {p.date} • Hadir: {p.attendance?.length || 0} daris ({p.attendance?.join(', ') || 'tidak ada'})
                    </div>
                    {p.notes && <div className="text-[11px] text-slate-600 italic">Catatan: {p.notes}</div>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
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
                {isImporting ? 'Mengimpor...' : `Impor ${csvPreview.length} Catatan Kajian`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
