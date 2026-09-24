import React, { useState, useRef, useEffect } from 'react';
import { AppConfig, ActivityLog, User } from '../types';
import { 
  Sliders, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  Copy, 
  ExternalLink, 
  RotateCcw, 
  Eye, 
  ShieldCheck, 
  FileText, 
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  Database,
  Download,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  Calendar,
  Users,
  HardDrive,
  X,
  History,
  Activity,
  Filter,
  Search,
  Trash2,
  FileSpreadsheet,
  ArrowDownToLine,
  Lock,
  Cloud,
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';

interface BackupSummary {
  totalGroups: number;
  totalMaterials: number;
  totalProgress: number;
  totalSchedules: number;
  totalStudents: number;
  totalUstadz: number;
  totalKontakan: number;
  totalKontakSchedules: number;
  totalKontakProgress: number;
  totalAgendaEvents: number;
  totalAgendaProgress: number;
  hasAppConfig: boolean;
}

interface AppSettingsPanelProps {
  appConfig: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  refresh: () => void;
  user?: User | null;
}

export default function AppSettingsPanel({ appConfig, onUpdateConfig, refresh, user }: AppSettingsPanelProps) {
  const [title, setTitle] = useState(appConfig.title || 'HalaqohApp');
  const [subtitle, setSubtitle] = useState(appConfig.subtitle || 'Dakwah Management System');
  const [logoUrl, setLogoUrl] = useState(appConfig.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(appConfig.faviconUrl || '');
  const [footerText, setFooterText] = useState(appConfig.footerText || 'Sistem Manajemen Halaqoh v2.4.0');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Backup states
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [loadingBackupInfo, setLoadingBackupInfo] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('last_database_backup_time') || '';
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Activity Log states
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');
  const [selectedLogModal, setSelectedLogModal] = useState<ActivityLog | null>(null);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);

  // Legal viewer modal state
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; title: string; type: 'privacy' | 'terms' }>({
    isOpen: false,
    title: '',
    type: 'privacy'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch backup info on mount
  const fetchBackupInfo = async () => {
    setLoadingBackupInfo(true);
    try {
      const res = await fetch('/api/backup');
      const json = await res.json();
      if (json.success && json.backup) {
        setBackupSummary(json.backup.summary);
        setPreviewData(json.backup);
      }
    } catch (err) {
      console.error('Failed to fetch backup info:', err);
    } finally {
      setLoadingBackupInfo(false);
    }
  };

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilterCategory !== 'ALL') params.append('category', logFilterCategory);
      if (logSearch.trim()) params.append('search', logSearch.trim());
      params.append('limit', '100');

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setActivityLogs(data.logs);
      }
    } catch (err) {
      console.error('Gagal mengambil data log aktivitas:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchBackupInfo();
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [logFilterCategory]);

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    setErrorMessage('');
    try {
      const actorName = user?.username || 'Super Administrator';
      const res = await fetch(`/api/backup?download=true&actor=${encodeURIComponent(actorName)}`);
      if (!res.ok) {
        throw new Error('Server mengembalikan kode status ' + res.status);
      }

      const blob = await res.blob();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const filenameDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const filename = `backup_database_halaqohapp_${filenameDate}.json`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      const timestampStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      setLastBackupTime(timestampStr);
      localStorage.setItem('last_database_backup_time', timestampStr);

      setSuccessMessage(`File cadangan database berhasil diunduh (${filename}). Berkas siap disimpan secara aman.`);
      setTimeout(() => setSuccessMessage(''), 6000);
      
      // Refresh summary and activity logs
      fetchBackupInfo();
      fetchActivityLogs();
    } catch (err: any) {
      console.error('Error downloading database backup:', err);
      setErrorMessage('Gagal mengunduh file cadangan: ' + err.message);
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleClearLogs = async () => {
    setClearingLogs(true);
    try {
      const res = await fetch('/api/activity-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: user?.username || 'Super Administrator' })
      });
      const data = await res.json();
      if (data.success) {
        setShowClearLogsModal(false);
        fetchActivityLogs();
        setSuccessMessage('Riwayat log aktivitas berhasil dibersihkan.');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err: any) {
      setErrorMessage('Gagal membersihkan log: ' + err.message);
    } finally {
      setClearingLogs(false);
    }
  };

  const handleExportLogs = (format: 'json' | 'csv') => {
    setExportingLogs(true);
    try {
      window.location.href = `/api/activity-logs/export?format=${format}`;
      setTimeout(() => setExportingLogs(false), 1500);
    } catch (err) {
      console.error('Failed to export logs:', err);
      setExportingLogs(false);
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 45) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return isoString;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'CONFIG':
        return {
          label: 'Konfigurasi',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Sliders
        };
      case 'BACKUP':
        return {
          label: 'Pencadangan',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: Database
        };
      case 'IMPORT':
        return {
          label: 'Impor Data',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Download
        };
      case 'EXPORT':
        return {
          label: 'Ekspor Data',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: ArrowDownToLine
        };
      case 'SECURITY':
        return {
          label: 'Keamanan',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: Lock
        };
      case 'SYNC':
        return {
          label: 'Sinkronisasi',
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: Cloud
        };
      default:
        return {
          label: category || 'Sistem',
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Activity
        };
    }
  };

  const handleCopyPreviewJson = () => {
    if (!previewData) return;
    navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  useEffect(() => {
    setTitle(appConfig.title || 'HalaqohApp');
    setSubtitle(appConfig.subtitle || 'Dakwah Management System');
    setLogoUrl(appConfig.logoUrl || '');
    setFaviconUrl(appConfig.faviconUrl || '');
    setFooterText(appConfig.footerText || 'Sistem Manajemen Halaqoh v2.4.0');
  }, [appConfig]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 5MB.');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/app-config/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              imageBase64: base64, 
              filename: file.name,
              actor: user?.username || 'Super Administrator'
            })
          });
          const resData = await res.json();
          if (resData.success) {
            setLogoUrl(resData.logoUrl);
            onUpdateConfig(resData.appConfig);
            setSuccessMessage('Logo berhasil diunggah dan langsung aktif!');
            setTimeout(() => setSuccessMessage(''), 4000);
            refresh();
            fetchActivityLogs();
          } else {
            setErrorMessage(resData.error || 'Gagal mengunggah logo');
          }
        } catch (err: any) {
          setErrorMessage('Gagal menghubungi server: ' + err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage('Gagal membaca file gambar: ' + err.message);
      setUploading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Judul aplikasi tidak boleh kosong.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const payload: AppConfig & { actor?: string } = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        logoUrl: logoUrl.trim(),
        faviconUrl: faviconUrl.trim(),
        footerText: footerText.trim(),
        actor: user?.username || 'Super Administrator'
      };

      const res = await fetch('/api/app-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onUpdateConfig(data.appConfig);
        setSuccessMessage('Pengaturan aplikasi berhasil disimpan & langsung aktif tanpa build ulang!');
        setTimeout(() => setSuccessMessage(''), 4000);
        refresh();
        fetchActivityLogs();
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kesalahan saat menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setTitle('HalaqohApp');
    setSubtitle('Dakwah Management System');
    setLogoUrl('');
    setFaviconUrl('');
    setFooterText('Sistem Manajemen Halaqoh v2.4.0');
  };

  const copyToClipboard = (text: string, label: string) => {
    const fullUrl = `${window.location.origin}${text}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const initialChar = title.trim().charAt(0).toUpperCase() || 'H';

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Tampilan & Identitas Aplikasi</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Sesuaikan nama aplikasi, sub-judul, logo kustom (menggantikan inisial 'H'), dan kelola halaman Kebijakan Privasi serta Terms of Service secara langsung tanpa perlu rebuild Node.js.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
            title="Kembalikan nama dan logo default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-3 animate-fade-in shadow-sm">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <Check className="w-4 h-4" />
          </div>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs (Left) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Nama & Identitas Aplikasi
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Judul Aplikasi (Application Title) <span className="text-red-500">*</span>
              </label>
              <input
                id="input-app-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Halaqoh Al-Hikmah"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
              />
              <p className="text-xs text-slate-500 mt-1">
                Akan menggantikan teks "HalaqohPro" di sidebar, header, judul tab browser, dan halaman login.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Sub-Judul / Tagline (Application Subtitle)
              </label>
              <input
                id="input-app-subtitle"
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Contoh: LMS Management / Sistem Pembinaan Daris"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ditampilkan di bawah judul aplikasi pada sidebar dan halaman login.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Teks Footer / Versi
              </label>
              <input
                id="input-app-footer"
                type="text"
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="Sistem Manajemen Halaqoh v2.4.0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
              />
            </div>
          </div>

          {/* Logo Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              Logo / Ikon Aplikasi (Menggantikan Huruf 'H')
            </h3>

            {/* Upload Box */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Opsi 1: Upload File Gambar Logo Langsung
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer hover:bg-emerald-50/30 transition group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp, image/x-icon" 
                  className="hidden" 
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition mb-3">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">
                  {uploading ? 'Mengunggah logo...' : 'Klik untuk memilih file logo dari komputer/ponsel'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung PNG, JPG, SVG, WebP, atau ICO (Maksimal 5MB)
                </p>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Opsi 2: Atau Tentukan URL Gambar / Ikon Eksternal
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-logo-url"
                  type="text"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://domain.com/logo.png atau /uploads/logo.png"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
                />
              </div>
              <p className="text-xs text-slate-500">
                Kosongkan URL ini jika ingin kembali menggunakan inisial huruf dari nama aplikasi (default).
              </p>
            </div>
          </div>
        </div>

        {/* Preview & Legal Cards (Right) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                Live Preview Tampilan
              </span>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Real-Time
              </span>
            </h3>

            {/* 1. Sidebar Brand Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Tampilan di Sidebar (Dark Mode):</span>
              <div className="bg-emerald-900 text-white p-4 rounded-xl border border-emerald-800 shadow-inner flex items-center gap-3">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo Preview" 
                    className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1 border border-white/20 shrink-0" 
                    onError={() => setErrorMessage('Gambar logo tidak dapat dimuat. Pastikan URL valid.')}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xl shrink-0 shadow-sm">
                    {initialChar}
                  </div>
                )}
                <div className="overflow-hidden">
                  <h4 className="text-lg font-bold tracking-tight text-white truncate leading-tight">
                    {title || 'HalaqohPro'}
                  </h4>
                  <p className="text-[11px] text-emerald-300/80 uppercase tracking-widest font-semibold truncate mt-0.5">
                    {subtitle || 'LMS MANAGEMENT'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Header Brand Preview */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-500">Tampilan di Top Header (Light Mode):</span>
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo Header" 
                      className="w-7 h-7 rounded-lg object-contain p-0.5 border border-slate-200 bg-slate-50 shrink-0" 
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {initialChar}
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-800">
                    {title || 'HalaqohPro'}
                  </span>
                </div>
                <span className="text-[11px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100">
                  Header Bar
                </span>
              </div>
            </div>

            {/* 3. Login Box Mini Preview */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-500">Tampilan di Kotak Login:</span>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo Login" 
                    className="w-12 h-12 rounded-xl object-contain p-1 border border-slate-200 bg-white shadow-sm mb-2" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white text-xl shadow-sm mb-2">
                    {initialChar}
                  </div>
                )}
                <span className="text-sm font-bold text-slate-800">{title || 'HalaqohPro'}</span>
                <span className="text-xs text-slate-500">{subtitle || 'LMS Management Login'}</span>
              </div>
            </div>
          </div>

          {/* Legal Documents Card (Privacy Policy & Terms of Service) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Dokumen Legal Tanpa Rebuild
            </h3>
            <p className="text-xs text-slate-500">
              Halaman ini telah dibuat sebagai file HTML statis mandiri yang disajikan langsung oleh server tanpa perlu build ulang Node.js:
            </p>

            <div className="space-y-3">
              {/* Privacy Policy */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Kebijakan Privasi (Privacy Policy)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Live
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200 truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/privacy-policy.html` : '/privacy-policy.html'}
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href="/privacy-policy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded text-center flex items-center justify-center gap-1 transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka Halaman
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('/privacy-policy.html', 'privacy')}
                    className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded flex items-center gap-1 transition"
                  >
                    {copiedLink === 'privacy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedLink === 'privacy' ? 'Tersalin' : 'Salin URL'}
                  </button>
                </div>
              </div>

              {/* Terms of Service */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Syarat & Ketentuan (Terms of Service)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Live
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200 truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/terms-of-service.html` : '/terms-of-service.html'}
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href="/terms-of-service.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded text-center flex items-center justify-center gap-1 transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka Halaman
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('/terms-of-service.html', 'terms')}
                    className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded flex items-center gap-1 transition"
                  >
                    {copiedLink === 'terms' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedLink === 'terms' ? 'Tersalin' : 'Salin URL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Database Backup Section (Full Width Card) */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Pencadangan Database Manual (Database Backup)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format JSON
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Unduh salinan lengkap seluruh data aplikasi ke dalam format JSON mandiri sebagai tindakan preventif keamanan dan pemulihan data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={fetchBackupInfo}
              disabled={loadingBackupInfo}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              title="Perbarui ringkasan data cadangan"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBackupInfo ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              disabled={!previewData}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-2"
              title="Lihat preview data cadangan"
            >
              <FileCode className="w-4 h-4 text-slate-500" />
              Preview JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {downloadingBackup ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Mengunduh...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Unduh Backup JSON
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Bar: Last Backup Time & Storage State */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-slate-600">
              Riwayat Pencadangan Terakhir:
            </span>
            {lastBackupTime ? (
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {lastBackupTime}
              </span>
            ) : (
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Belum pernah dicadangkan di peramban ini
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Format: <code className="font-semibold text-slate-700">.json</code> • Encoding: UTF-8 • Siap Diarsip</span>
          </div>
        </div>

        {/* Breakdown of items included in backup */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Rincian Cakupan Data Yang Dicadangkan:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Pelajar (Daris)</span>
              <span className="text-xl font-black text-slate-900 mt-1">
                {backupSummary ? backupSummary.totalStudents : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Kelompok Halaqoh</span>
              <span className="text-xl font-black text-slate-900 mt-1">
                {backupSummary ? backupSummary.totalGroups : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Ustadz Pembina</span>
              <span className="text-xl font-black text-slate-900 mt-1">
                {backupSummary ? backupSummary.totalUstadz : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Progres & Presensi</span>
              <span className="text-xl font-black text-slate-900 mt-1">
                {backupSummary ? backupSummary.totalProgress : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Database Kontakan</span>
              <span className="text-xl font-black text-slate-900 mt-1">
                {backupSummary ? backupSummary.totalKontakan : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Jadwal & Agenda</span>
              <span className="text-xl font-black text-slate-900 mt-1">
                {backupSummary ? (backupSummary.totalSchedules + backupSummary.totalKontakSchedules + backupSummary.totalAgendaEvents) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Recommendation Note */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Rekomendasi Antisipasi Keamanan & Pengarsipan:</span>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              Lakukan pencadangan berkala setelah melakukan pembaruan data dalam jumlah besar (seperti penambahan daris baru, pencatatan presensi mingguan, atau penambahan kontakan). Simpan file JSON cadangan pada media eksternal yang aman seperti Google Drive terenkripsi atau hard drive lokal.
            </p>
          </div>
        </div>
      </div>

      {/* Activity Log / Jejak Audit Section (Full Width Card) */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-lg">Log Aktivitas & Jejak Audit (Activity Log)</h3>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                  {activityLogs.length} Catatan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit tracking otomatis untuk mencatat tindakan administratif krusial: konfigurasi sistem, impor/ekspor data, cadangan database, dan keamanan akun.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={fetchActivityLogs}
              disabled={loadingLogs}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-60"
              title="Perbarui daftar log"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportLogs('csv')}
              disabled={exportingLogs || activityLogs.length === 0}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Unduh log dalam format CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportLogs('json')}
              disabled={exportingLogs || activityLogs.length === 0}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Unduh log dalam format JSON"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-blue-600" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearLogsModal(true)}
              disabled={activityLogs.length === 0}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-40"
              title="Bersihkan seluruh riwayat audit"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchActivityLogs();
              }}
              placeholder="Cari aktivitas, tindakan, atau admin..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
            {logSearch && (
              <button
                type="button"
                onClick={() => {
                  setLogSearch('');
                  setTimeout(fetchActivityLogs, 50);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips / Select */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3" />
              Kategori:
            </span>
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'CONFIG', label: 'Konfigurasi' },
              { id: 'BACKUP', label: 'Pencadangan' },
              { id: 'IMPORT', label: 'Impor' },
              { id: 'EXPORT', label: 'Ekspor' },
              { id: 'SECURITY', label: 'Keamanan' },
              { id: 'SYNC', label: 'Sinkronisasi' }
            ].map((cat) => {
              const active = logFilterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setLogFilterCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    active
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          {loadingLogs ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Memuat riwayat log audit...</p>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-1">
                <History className="w-6 h-6" />
              </div>
              <h5 className="font-bold text-slate-700 text-sm">Tidak Ada Catatan Aktivitas</h5>
              <p className="text-xs text-slate-400 max-w-sm">
                {logSearch || logFilterCategory !== 'ALL'
                  ? 'Tidak ditemukan riwayat log yang sesuai dengan filter atau kata kunci pencarian.'
                  : 'Belum ada aktivitas administratif yang dicatat dalam sistem.'}
              </p>
              {(logSearch || logFilterCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setLogSearch('');
                    setLogFilterCategory('ALL');
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                >
                  Reset Filter & Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-40">Waktu</th>
                    <th className="py-3 px-3 w-32">Kategori</th>
                    <th className="py-3 px-4">Tindakan & Deskripsi</th>
                    <th className="py-3 px-4 w-40">Pelaku</th>
                    <th className="py-3 px-3 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activityLogs.map((log) => {
                    const badge = getCategoryBadge(log.category);
                    const CategoryIcon = badge.icon;
                    const hasDetails = log.details && Object.keys(log.details).length > 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[10px] text-purple-600 font-medium mt-0.5">
                              {formatTimeAgo(log.timestamp)}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${badge.color}`}>
                            <CategoryIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{log.title}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {log.action}
                              </span>
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed">
                              {log.description}
                            </p>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                              {(log.actor || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 text-xs">{log.actor || 'Administrator'}</span>
                              <span className="text-[10px] text-slate-400">Sistem / Admin</span>
                            </div>
                          </div>
                        </td>

                        {/* Details inspection */}
                        <td className="py-3.5 px-3 align-top text-center">
                          {hasDetails ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLogModal(log)}
                              className="px-2 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition"
                              title="Lihat metadata JSON rincian"
                            >
                              Rincian
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Inspeksi Log */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Rincian Metadata Log Audit</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedLogModal.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Tindakan</span>
                  <span className="font-bold text-slate-800">{selectedLogModal.title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Kategori / Action</span>
                  <span className="font-semibold text-purple-700">{selectedLogModal.category} ({selectedLogModal.action})</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Waktu Tercatat</span>
                  <span className="text-slate-700">{new Date(selectedLogModal.timestamp).toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Pelaku</span>
                  <span className="font-semibold text-slate-800">{selectedLogModal.actor}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">Deskripsi Aktivitas:</span>
                <p className="p-2.5 bg-slate-100/70 rounded-lg text-slate-700 leading-relaxed border border-slate-200/60">
                  {selectedLogModal.description}
                </p>
              </div>

              {selectedLogModal.details && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700">Metadata Payload (JSON):</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedLogModal.details, null, 2))}
                      className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Salin JSON
                    </button>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedLogModal.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white rounded-xl border border-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pembersihan Log */}
      {showClearLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bersihkan Semua Log Aktivitas?</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-100">
              Apakah Anda yakin ingin menghapus seluruh riwayat aktivitas audit yang ada? Entri baru yang mencatat pembersihan ini akan secara otomatis dibuat untuk menjaga integritas jejak audit.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearLogsModal(false)}
                disabled={clearingLogs}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={clearingLogs}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-60"
              >
                {clearingLogs ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Bersihkan Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Data JSON Cadangan */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Preview Struktur Data Cadangan (JSON)</h4>
                  <p className="text-[11px] text-slate-500">
                    Diekspor pada: {previewData.exportedAt} • Versi: {previewData.version}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-5 overflow-y-auto flex-1 bg-slate-950 font-mono text-[11px] text-emerald-400 select-all">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyPreviewJson}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5"
              >
                {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                {copiedPreview ? 'JSON Tersalin!' : 'Salin JSON ke Clipboard'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white rounded-xl border border-slate-200 transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleDownloadBackup();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Berkas JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
