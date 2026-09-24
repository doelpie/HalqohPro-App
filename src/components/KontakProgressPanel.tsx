import React, { useState, useRef } from 'react';
import { KontakProgress, Kontakan, Material, User } from '../types';
import { Download, Upload, FileText, BookOpen } from 'lucide-react';
import { downloadCSV, parseCSV } from '../utils/csv';

export default function KontakProgressPanel({
  kontakProgress,
  kontakan,
  materials = [],
  refresh,
  user
}: {
  kontakProgress: KontakProgress[];
  kontakan: Kontakan[];
  materials?: Material[];
  refresh: () => void;
  user: User;
}) {
  const [selectedKontakan, setSelectedKontakan] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [date, setDate] = useState('');
  const [pembahasan, setPembahasan] = useState('');
  const [notes, setNotes] = useState('');

  // CSV States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const displayedKontakan = kontakan.filter(
    k => user.role === 'Super Administrator' || k.createdBy === user.ustadzName
  );

  const displayedProgress = kontakProgress.filter(p =>
    user.role === 'Super Administrator' || p.createdBy === user.ustadzName
  );

  const saveProgress = async () => {
    if (!selectedKontakan || !date || !pembahasan) return alert('Mohon isi kontakan, tanggal, dan pembahasan');

    await fetch('/api/kontakProgress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kontakanId: selectedKontakan,
        date,
        materialId: selectedMaterialId || undefined,
        pembahasan,
        notes,
        createdBy: user.ustadzName
      })
    });

    const k = kontakan.find(x => x.id === selectedKontakan);
    try {
      await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Kontak: ${k?.name} - ${pembahasan}`,
          date,
          description: `Kontak dengan: ${k?.name}\nPembahasan: ${pembahasan}\nCatatan: ${notes}`
        })
      });
      alert('Tersimpan & Ditambahkan ke Google Calendar (jika terhubung).');
    } catch (err) {
      alert('Tersimpan di local, tapi belum sync kalender.');
    }

    setSelectedKontakan('');
    setSelectedMaterialId('');
    setDate('');
    setPembahasan('');
    setNotes('');
    refresh();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (displayedProgress.length === 0) return alert('Tidak ada riwayat progress kontak untuk diexport');
    const headers = ['Nama Kontakan', 'Waktu Kontak', 'Topik Pembahasan', 'Catatan Tambahan', 'Dicatat Oleh'];
    const rows = displayedProgress.map(p => {
      const k = kontakan.find(x => x.id === p.kontakanId);
      return [
        k?.name || p.kontakanId,
        p.date,
        p.pembahasan || '',
        p.notes || '',
        p.createdBy || ''
      ];
    });
    downloadCSV('Progress_Riwayat_Kontak.csv', headers, rows);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['Nama Kontakan (atau ID Kontakan)', 'Waktu Kontak (YYYY-MM-DD HH:mm)', 'Topik Pembahasan', 'Catatan Tambahan'];
    const sampleKontakanName = displayedKontakan[0]?.name || 'Rian Saputra';
    const exampleRows = [
      [sampleKontakanName, '2026-04-12 10:00', 'Silaturahmi dan perkenalan awal', 'Tertarik untuk ikut kajian pekanan'],
      [sampleKontakanName, '2026-04-19 14:00', 'Follow up materi dasar Islam', 'Siap dimasukkan ke kelompok daris']
    ];
    downloadCSV('Template_Import_Progress_Kontak.csv', headers, exampleRows);
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

      const parsed: KontakProgress[] = [];
      for (const r of rows) {
        const kontakanNameOrId = (r[0] || '').trim();
        const pDate = (r[1] || '').trim();
        const pPembahasan = (r[2] || '').trim();
        const pNotes = (r[3] || '').trim();

        const matchK = kontakan.find(k => k.id === kontakanNameOrId || k.name.toLowerCase() === kontakanNameOrId.toLowerCase());
        const targetKontakanId = matchK ? matchK.id : (kontakan[0]?.id || 'default');

        if (pDate && pPembahasan) {
          parsed.push({
            id: 'kp-' + Math.random().toString(36).substr(2, 9),
            kontakanId: targetKontakanId,
            date: pDate,
            pembahasan: pPembahasan,
            notes: pNotes,
            createdBy: user.ustadzName || user.username
          });
        }
      }

      if (parsed.length === 0) {
        alert('Tidak ditemukan data progress kontak yang valid pada file CSV');
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
        body: JSON.stringify({ entity: 'kontakProgress', items: csvPreview })
      });
      if (res.ok) {
        setCsvPreview(null);
        refresh();
        alert(`Berhasil mengimpor ${csvPreview.length} data progress kontak!`);
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
      {/* Hidden CSV input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCSVSelect}
        accept=".csv,text/csv"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Progres Kontak Daris</h2>
          <p className="text-slate-500 text-sm">Pencatatan perkembangan interaksi dan materi dakwah daris</p>
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
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Catat Progres Kontak Daris</h3>
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kontakan</label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={selectedKontakan}
              onChange={e => setSelectedKontakan(e.target.value)}
            >
              <option value="">Pilih Kontakan</option>
              {displayedKontakan.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu Kontak</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              Pilih Materi Kajian (Silabus)
            </label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={selectedMaterialId}
              onChange={e => {
                const matId = e.target.value;
                setSelectedMaterialId(matId);
                const mat = materials.find(m => m.id === matId);
                if (mat) {
                  setPembahasan(`Pertemuan ${mat.meeting}: ${mat.title}`);
                }
              }}
            >
              <option value="">-- Pilih Materi Kajian (Otomatis Isi Pembahasan) --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  Pertemuan {m.meeting}: {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Pembahasan</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
              value={pembahasan}
              onChange={e => setPembahasan(e.target.value)}
              placeholder="Topik pembahasan..."
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Catatan Tambahan</label>
          <textarea
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Catatan hasil diskusi..."
          ></textarea>
        </div>
        
        <button
          onClick={saveProgress}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center rounded-lg shadow-sm transition-colors text-sm w-fit mt-2"
        >
          Simpan & Jadwalkan Kalender
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 p-5 border-b border-slate-200 uppercase tracking-wider">Riwayat Kontak</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kontakan</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pembahasan & Materi</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ustadz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedProgress.slice().reverse().map(p => {
                const k = kontakan.find(x => x.id === p.kontakanId);
                const mat = materials.find(m => m.id === p.materialId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-800 font-bold">{k?.name || 'Unknown'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(p.date).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">
                      <div>
                        {mat && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                            <BookOpen className="w-3 h-3" />
                            Pertemuan {mat.meeting}
                          </span>
                        )}
                        <p>{p.pembahasan}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-emerald-600">{p.createdBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Preview Modal */}
      {csvPreview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Import CSV Progress Kontak
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{csvPreview.length} catatan progress kontak</strong> yang siap dimasukkan ke sistem.
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
                const k = kontakan.find(x => x.id === p.kontakanId);
                return (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{idx + 1}. {k?.name || p.kontakanId}</span>
                      <span className="text-slate-500 text-[11px]">{p.date}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium">
                      Topik: {p.pembahasan}
                    </div>
                    {p.notes && <div className="text-[11px] text-slate-500 italic">Catatan: {p.notes}</div>}
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
                {isImporting ? 'Mengimpor...' : `Impor ${csvPreview.length} Catatan Kontak`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
