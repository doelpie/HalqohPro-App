const fs = require('fs');
let code = fs.readFileSync('src/components/SyncPanel.tsx', 'utf8');

const replacement = `
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
`;

code = code.replace(/export default function SyncPanel\(\) {.*?}, \[\]\);/s, replacement);


const replacement2 = `
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
`;

code = code.replace(/<div className="flex items-center justify-between">\s*<h2 className="text-2xl font-bold text-slate-900">Integrasi Eksternal<\/h2>\s*<\/div>/s, replacement2);

fs.writeFileSync('src/components/SyncPanel.tsx', code);
