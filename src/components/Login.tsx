import React, { useState } from 'react';
import { User, AppConfig } from '../types';

export default function Login({ 
  onLogin, 
  appConfig 
}: { 
  onLogin: (user: User) => void;
  appConfig?: AppConfig;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const appTitle = appConfig?.title || 'HalaqohPro';
  const appSubtitle = appConfig?.subtitle || 'LMS Management Login';
  const logoUrl = appConfig?.logoUrl || '';
  const initialChar = appTitle.charAt(0).toUpperCase() || 'H';
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f8fafc] px-4 py-8">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={appTitle} 
              className="w-14 h-14 rounded-2xl object-contain mb-4 p-1 shadow-sm border border-slate-100 bg-white" 
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white text-2xl mb-4 shadow-sm">
              {initialChar}
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{appTitle}</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">{appSubtitle}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center border border-red-100">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Username</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            Masuk
          </button>
        </form>
      </div>

      {/* Footer Legal Links */}
      <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
        <a 
          href="/privacy-policy.html" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-emerald-700 hover:underline transition"
        >
          Kebijakan Privasi
        </a>
        <span>•</span>
        <a 
          href="/terms-of-service.html" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-emerald-700 hover:underline transition"
        >
          Syarat & Ketentuan
        </a>
      </div>
    </div>
  );
}

