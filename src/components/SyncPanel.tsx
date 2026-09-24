import React, { useState, useEffect } from 'react';


import { Settings2, Save } from 'lucide-react';

export default function SyncPanel() {
  const [authUrl, setAuthUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchAuthUrl = () => {
    fetch('/api/auth/url')
      .then(res => res.json())
      .then(data => {
        if (data.url) setAuthUrl(data.url);
      });
  };

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setIsConnected(data.connected));
      
    fetchAuthUrl();
    
    fetch('/api/settings/oauth')
      .then(res => res.json())
      .then(data => {
        setClientId(data.clientId || '');
        setClientSecret(data.clientSecret || '');
        setRedirectUri(data.redirectUri || '');
      });

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await fetch('/api/settings/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret, redirectUri })
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      fetchAuthUrl(); // refresh url
    } catch (err) {
      alert('Gagal menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };


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

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Integrasi Eksternal</h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          Pengaturan OAuth
        </button>
      </div>
      
      {showSettings && (
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 text-slate-300">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Konfigurasi Google API</h3>
            <p className="text-sm text-slate-400 mt-1">Masukkan credential dari Google Cloud Console. Pengaturan ini akan disimpan di database Anda sehingga aman untuk cPanel.</p>
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Client ID</label>
              <input 
                type="text" 
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Contoh: 123456789-abc.apps.googleusercontent.com"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:bg-slate-900 focus:border-emerald-500 outline-none text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Client Secret</label>
              <input 
                type="password" 
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder="********"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:bg-slate-900 focus:border-emerald-500 outline-none text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Redirect URI (Opsional)</label>
              <input 
                type="text" 
                value={redirectUri}
                onChange={e => setRedirectUri(e.target.value)}
                placeholder="Contoh: https://halqohapp.inysign.net/halqohapp/api/auth/callback"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:bg-slate-900 focus:border-emerald-500 outline-none text-sm text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Isi hanya jika aplikasi di-host di dalam subfolder (misal: /halqohapp). Jika kosong, sistem akan menebak URL otomatis.</p>
            </div>
            <button 
              type="submit" 
              disabled={savingSettings}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? 'Menyimpan...' : (settingsSaved ? 'Tersimpan!' : 'Simpan Konfigurasi')}
            </button>
          </form>
        </div>
      )}


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
        </div>
      </div>
    </div>
  );
}
