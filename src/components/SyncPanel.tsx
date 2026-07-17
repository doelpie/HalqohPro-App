import React, { useState, useEffect } from 'react';

export default function SyncPanel() {
  const [authUrl, setAuthUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setIsConnected(data.connected));

    fetch('/api/auth/url')
      .then(res => res.json())
      .then(data => {
        if (data.url) setAuthUrl(data.url);
      });

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = () => {
    if (authUrl) {
      window.open(authUrl, 'oauth_popup', 'width=600,height=700');
    } else {
      alert("Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Settings.");
    }
  };

  const handleSyncSheets = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/sheets', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Berhasil disinkronisasi ke Google Sheets!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncDrive = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/drive', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Berhasil dibackup ke Google Drive!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/reports/csv', '_blank');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Integrasi Eksternal</h2>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Google Workspace Connection</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Hubungkan akun Google Management untuk Sinkronisasi otomatis ke Sheets & Calendar.</p>
            </div>
            <span className={`px-3 py-1 flex items-center justify-center text-xs font-bold uppercase tracking-wider rounded-full self-start md:self-center shrink-0 border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              {isConnected ? 'Terhubung' : 'Terputus'}
            </span>
          </div>
          {!isConnected && (
            <button 
              onClick={handleConnect}
              className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors w-fit flex items-center"
            >
              Hubungkan dengan Google
            </button>
          )}
        </div>

        <div className="space-y-4 max-w-3xl">
          <div className="p-5 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors">
            <div>
              <h4 className="font-bold text-slate-800">Google Sheets Sync</h4>
              <p className="text-sm font-medium text-slate-500 mt-1">Sinkronisasi data kelompok dan riwayat presensi ke Spreadsheet.</p>
            </div>
            <button 
              onClick={handleSyncSheets}
              disabled={!isConnected || syncing}
              className="px-5 py-2 w-full sm:w-auto bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm shrink-0 whitespace-nowrap"
            >
              {syncing ? 'Syncing...' : 'Sync Sekarang'}
            </button>
          </div>

          <div className="p-5 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors">
            <div>
              <h4 className="font-bold text-slate-800">Google Drive Backup</h4>
              <p className="text-sm font-medium text-slate-500 mt-1">Backup seluruh data aplikasi ke dalam Google Drive.</p>
            </div>
            <button 
              onClick={handleSyncDrive}
              disabled={!isConnected || syncing}
              className="px-5 py-2 w-full sm:w-auto bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm shrink-0 whitespace-nowrap"
            >
              {syncing ? 'Backing up...' : 'Backup ke Drive'}
            </button>
          </div>

          <div className="p-5 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors">
            <div>
              <h4 className="font-bold text-slate-800">Export Laporan CSV</h4>
              <p className="text-sm font-medium text-slate-500 mt-1">Download rekap presensi seluruh kelompok untuk record eksternal.</p>
            </div>
            <button 
              onClick={handleExportCSV}
              className="px-5 py-2 w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm shrink-0 whitespace-nowrap"
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
