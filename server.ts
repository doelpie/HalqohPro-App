import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import fs from 'fs';

const app = express();
const PORT = 3000;

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Legal static pages for Privacy Policy and Terms of Service
app.get(['/privacy-policy', '/privacy-policy.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'privacy-policy.html'));
});
app.get(['/terms-of-service', '/terms-of-service.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'terms-of-service.html'));
});

// --- Database Simulation ---
const DB_FILE = path.join(process.cwd(), 'database.json');

const defaultAppConfig = {
  title: 'HalaqohApp',
  subtitle: 'Dakwah Management System',
  logoUrl: '',
  faviconUrl: '',
  footerText: 'Sistem Manajemen Halaqoh v2.4.0'
};

const defaultData = {
  groups: [
    { id: 'g1', ustadz: 'Teguh', students: ['Anjar', 'Fharien', 'Yusuf'] },
    { id: 'g2', ustadz: 'Ahmad Surya', students: ['Naufal', 'Alfan', 'Rayyan', 'Muzakki'] },
    { id: 'g3', ustadz: 'Adi', students: ['Wahyu', 'Alfian', 'Imam', 'Ayyubi'] },
    { id: 'g4', ustadz: 'Margo', students: ['Sayid', 'Apri'] },
  ],
  materials: [
    { id: 'm1', meeting: 1, title: 'Dosa Investasi', slideLink: '', videoLink: '' },
    { id: 'm2', meeting: 2, title: 'Pahala Investasi', slideLink: '', videoLink: '' },
    { id: 'm3', meeting: 3, title: 'Visi Link Materi', slideLink: '', videoLink: '' },
    { id: 'm4', meeting: 4, title: 'Aqidah Pondasi', slideLink: '', videoLink: '' },
    { id: 'm5', meeting: 5, title: 'Teori Berfikir 1', slideLink: '', videoLink: '' },
    { id: 'm6', meeting: 6, title: 'Teori Berfikir 2', slideLink: '', videoLink: '' },
    { id: 'm7', meeting: 7, title: 'Teori Berfikir 3', slideLink: '', videoLink: '' },
    { id: 'm8', meeting: 8, title: 'Pemecah Aqidah 1', slideLink: '', videoLink: '' },
    { id: 'm9', meeting: 9, title: 'Pemecah Aqidah 2 dan 3', slideLink: '', videoLink: '' },
    { id: 'm10', meeting: 10, title: 'Tujuan Hidup Manusia', slideLink: '', videoLink: '' },
    { id: 'm11', meeting: 11, title: 'Makna Qodho dan Qodar', slideLink: '', videoLink: '' },
    { id: 'm12', meeting: 12, title: 'Makna Hidayah dan Dholalah', slideLink: '', videoLink: '' },
    { id: 'm13', meeting: 13, title: 'Makna Tawakkal dalam Islam', slideLink: '', videoLink: '' },
    { id: 'm14', meeting: 14, title: 'Makna Rejeki dalam Islam', slideLink: '', videoLink: '' },
    { id: 'm15', meeting: 15, title: 'Makna Ajal Dalam Islam', slideLink: '', videoLink: '' },
    { id: 'm16', meeting: 16, title: 'Kedudukan Doa Dalam Islam', slideLink: '', videoLink: '' }
  ],
  progress: [], // { groupId, meeting, date, attendance: string[], notes: string }
  schedules: [], // { id, groupId, date, time, title, description }
  students: [], // { id, name, origin, address, phone, createdBy, groupId }
  ustadz: [], // { id, name, origin, address, phone }
  kontakan: [],
  kontakSchedules: [],
  kontakProgress: [],
  agendaEvents: [],
  agendaProgress: [],
  tokens: {}, // Google OAuth tokens
  users: [
    { id: 'u1', username: 'Admin Teguh', password: '@Teguh9495', role: 'Super Administrator', ustadzName: 'Teguh' },
    { id: 'u2', username: 'Ustadz Margo', password: '@000MuslimBali', role: 'Super Administrator', ustadzName: 'Margo' },
    { id: 'u3', username: 'Ustadz Adi', password: '@000MuslimBali', role: 'Ustadz', ustadzName: 'Adi' },
    { id: 'u4', username: 'Ustadz Ahmad Surya', password: '@000MuslimBali', role: 'Ustadz', ustadzName: 'Ahmad Surya' }
  ],
  activityLogs: []
};

function readDB() {
  if (fs.existsSync(DB_FILE)) {
    let data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    let modified = false;
    
    if (!data.users) {
      data.users = defaultData.users;
      modified = true;
    }
    
    if (!data.students) {
      data.students = [];
      modified = true;
    }
    
    if (!data.ustadz) {
      data.ustadz = [];
      modified = true;
    }

    // Migration: Extract Ustadz and Students from groups if our lists are empty
    if (data.ustadz.length === 0 && data.groups) {
      const ustadzSet = new Set<string>();
      data.groups.forEach((g: any) => ustadzSet.add(g.ustadz));
      Array.from(ustadzSet).forEach((name: string) => {
        data.ustadz.push({ id: `u_${Date.now()}_${Math.random()}`, name, origin: '', address: '', phone: '' });
      });
      modified = true;
    }

    if (data.students.length === 0 && data.groups) {
      const studentSet = new Set<string>();
      data.groups.forEach((g: any) => {
        g.students.forEach((s: string) => studentSet.add(s));
      });
      Array.from(studentSet).forEach((name: string) => {
        data.students.push({ id: `s_${Date.now()}_${Math.random()}`, name, origin: '', address: '', phone: '', createdBy: 'System' });
      });
      modified = true;
    }

    if (!data.appConfig) {
      data.appConfig = { ...defaultAppConfig };
      modified = true;
    }

    if (!data.agendaEvents) {
      data.agendaEvents = [];
      modified = true;
    }

    if (!data.agendaProgress) {
      data.agendaProgress = [];
      modified = true;
    }

    if (!data.activityLogs) {
      data.activityLogs = [
        {
          id: `log_init_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'CONFIG_UPDATE',
          category: 'CONFIG',
          title: 'Inisialisasi Sistem HalaqohPro',
          description: 'Sistem audit trail dan log aktivitas aplikasi berhasil diaktifkan.',
          actor: 'System',
          details: { version: '2.4.0' }
        }
      ];
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    }
    
    return data;
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  return defaultData;
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function logActivity(
  action: string,
  category: string,
  title: string,
  description: string,
  actor: string = 'Super Administrator',
  details: any = null
) {
  try {
    const data = readDB();
    if (!data.activityLogs) data.activityLogs = [];
    const logEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString(),
      action,
      category,
      title,
      description,
      actor: actor || 'Super Administrator',
      details: details || {}
    };
    data.activityLogs.unshift(logEntry);
    if (data.activityLogs.length > 300) {
      data.activityLogs = data.activityLogs.slice(0, 300);
    }
    writeDB(data);
    return logEntry;
  } catch (err) {
    console.error('Failed to write activity log:', err);
    return null;
  }
}

// Ensure DB exists
readDB();

// --- API Routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = readDB();
  const user = data.users.find((u: any) => u.username === username && u.password === password);
  if (user) {
    const { password: _password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const data = readDB();
  const userIndex = data.users.findIndex((u: any) => u.id === userId && u.password === currentPassword);
  
  if (userIndex !== -1) {
    const user = data.users[userIndex];
    user.password = newPassword;
    writeDB(data);
    logActivity(
      'PASSWORD_CHANGE',
      'SECURITY',
      'Perubahan Kata Sandi Akun',
      `Pengguna "${user.username}" (${user.role}) berhasil memperbarui kata sandi akun`,
      user.username,
      { userId: user.id, username: user.username }
    );
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Password saat ini salah.' });
  }
});

app.get('/api/data', (req, res) => {
  const data = readDB();
  res.json({ 
    groups: data.groups, 
    materials: data.materials, 
    progress: data.progress, 
    schedules: data.schedules || [],
    students: data.students || [],
    ustadz: data.ustadz || [],
    kontakan: data.kontakan || [],
    kontakSchedules: data.kontakSchedules || [],
    kontakProgress: data.kontakProgress || [],
    agendaEvents: data.agendaEvents || [],
    agendaProgress: data.agendaProgress || [],
    appConfig: data.appConfig || defaultAppConfig
  });
});

app.get('/api/app-config', (req, res) => {
  const data = readDB();
  res.json(data.appConfig || defaultAppConfig);
});

app.post('/api/app-config', (req, res) => {
  const data = readDB();
  if (!data.appConfig) data.appConfig = { ...defaultAppConfig };

  const { title, subtitle, logoUrl, faviconUrl, footerText, actor } = req.body;
  if (title !== undefined) data.appConfig.title = title.trim() || 'HalaqohApp';
  if (subtitle !== undefined) data.appConfig.subtitle = subtitle.trim();
  if (logoUrl !== undefined) data.appConfig.logoUrl = logoUrl;
  if (faviconUrl !== undefined) data.appConfig.faviconUrl = faviconUrl;
  if (footerText !== undefined) data.appConfig.footerText = footerText;

  writeDB(data);

  logActivity(
    'CONFIG_UPDATE',
    'CONFIG',
    'Pembaruan Konfigurasi Sistem',
    `Identitas aplikasi berhasil diperbarui: Judul "${data.appConfig.title}", Sub-judul "${data.appConfig.subtitle || '-'}"`,
    actor || 'Super Administrator',
    { title: data.appConfig.title, subtitle: data.appConfig.subtitle, footerText: data.appConfig.footerText }
  );

  res.json({ success: true, appConfig: data.appConfig });
});

app.post('/api/app-config/upload-logo', (req, res) => {
  try {
    const { imageBase64, filename, actor } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar tidak ditemukan' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'png';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('svg')) ext = 'svg';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      else if (mime.includes('x-icon') || mime.includes('ico')) ext = 'ico';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const safeName = `logo-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const logoUrl = `/uploads/${safeName}`;

    const data = readDB();
    if (!data.appConfig) data.appConfig = { ...defaultAppConfig };
    data.appConfig.logoUrl = logoUrl;
    writeDB(data);

    logActivity(
      'LOGO_UPLOAD',
      'CONFIG',
      'Unggah Logo Kustom',
      `Logo kustom aplikasi berhasil diperbarui (${filename || safeName})`,
      actor || 'Super Administrator',
      { logoUrl, filename: filename || safeName }
    );

    res.json({ success: true, logoUrl, appConfig: data.appConfig });
  } catch (err: any) {
    console.error('Error saving logo upload:', err);
    res.status(500).json({ error: 'Gagal mengunggah logo: ' + err.message });
  }
});

// --- Manual Database Backup Endpoint ---
app.get('/api/backup', (req, res) => {
  try {
    const data = readDB();
    const timestamp = new Date().toISOString();
    
    // Safely exclude sensitive password credentials while keeping user references
    const safeUsers = (data.users || []).map((u: any) => {
      const { password, ...safe } = u;
      return safe;
    });

    const summary = {
      totalGroups: data.groups?.length || 0,
      totalMaterials: data.materials?.length || 0,
      totalProgress: data.progress?.length || 0,
      totalSchedules: data.schedules?.length || 0,
      totalStudents: data.students?.length || 0,
      totalUstadz: data.ustadz?.length || 0,
      totalKontakan: data.kontakan?.length || 0,
      totalKontakSchedules: data.kontakSchedules?.length || 0,
      totalKontakProgress: data.kontakProgress?.length || 0,
      totalAgendaEvents: data.agendaEvents?.length || 0,
      totalAgendaProgress: data.agendaProgress?.length || 0,
      hasAppConfig: !!data.appConfig
    };

    const backupPayload = {
      app: data.appConfig?.title || 'HalaqohApp',
      version: '2.4.0',
      type: 'full_database_backup',
      exportedAt: timestamp,
      summary,
      data: {
        groups: data.groups || [],
        materials: data.materials || [],
        progress: data.progress || [],
        schedules: data.schedules || [],
        students: data.students || [],
        ustadz: data.ustadz || [],
        kontakan: data.kontakan || [],
        kontakSchedules: data.kontakSchedules || [],
        kontakProgress: data.kontakProgress || [],
        agendaEvents: data.agendaEvents || [],
        agendaProgress: data.agendaProgress || [],
        appConfig: data.appConfig || defaultAppConfig,
        users: safeUsers
      }
    };

    // If query parameter download=true is passed, trigger direct file download & audit log
    if (req.query.download === 'true') {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const filenameDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const filename = `backup_database_halaqohapp_${filenameDate}.json`;
      const actor = (req.query.actor as string) || 'Super Administrator';

      logActivity(
        'BACKUP_EXPORT',
        'BACKUP',
        'Unduh Cadangan Database JSON',
        `Pencadangan database lengkap diunduh (${summary.totalStudents} pelajar, ${summary.totalGroups} kelompok, ${summary.totalKontakan} kontakan)`,
        actor,
        { filename, summary }
      );

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify(backupPayload, null, 2));
    }

    res.json({ success: true, backup: backupPayload });
  } catch (err: any) {
    console.error('Error generating database backup:', err);
    res.status(500).json({ success: false, error: 'Gagal membuat cadangan database: ' + err.message });
  }
});

// --- Activity Log Endpoints ---
app.get('/api/activity-logs', (req, res) => {
  try {
    const data = readDB();
    const logs = data.activityLogs || [];
    const { category, search, limit } = req.query;

    let filtered = [...logs];
    if (category && category !== 'ALL') {
      filtered = filtered.filter((l: any) => l.category === category);
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter((l: any) =>
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.actor && l.actor.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q))
      );
    }

    const max = limit ? parseInt(String(limit), 10) : 150;
    res.json({
      success: true,
      logs: filtered.slice(0, max),
      total: logs.length,
      filteredTotal: filtered.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/activity-logs', (req, res) => {
  try {
    const { action, category, title, description, actor, details } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Judul aktivitas (title) wajib diisi' });
    }
    const entry = logActivity(
      action || 'CUSTOM',
      category || 'SYSTEM',
      title,
      description || '',
      actor || 'Super Administrator',
      details
    );
    res.json({ success: true, log: entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activity-logs', (req, res) => {
  try {
    const data = readDB();
    const count = data.activityLogs?.length || 0;
    const actor = req.body?.actor || 'Super Administrator';
    data.activityLogs = [];
    writeDB(data);

    logActivity(
      'SYSTEM_RESET',
      'SECURITY',
      'Pembersihan Riwayat Audit Log',
      `Seluruh riwayat catatan aktivitas (${count} entri) telah dibersihkan oleh ${actor}`,
      actor
    );

    res.json({ success: true, message: 'Log aktivitas berhasil dibersihkan' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activity-logs/export', (req, res) => {
  try {
    const data = readDB();
    const logs = data.activityLogs || [];
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

    if (format === 'csv') {
      const headers = ['ID', 'Waktu (ISO)', 'Kategori', 'Tindakan', 'Judul', 'Deskripsi', 'Pelaku'];
      const rows = logs.map((l: any) => [
        `"${l.id || ''}"`,
        `"${l.timestamp || ''}"`,
        `"${l.category || ''}"`,
        `"${l.action || ''}"`,
        `"${(l.title || '').replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${(l.actor || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');

      res.setHeader('Content-Disposition', `attachment; filename="audit_activity_logs_${dateStr}.csv"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(csvContent);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="audit_activity_logs_${dateStr}.json"`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify({ exportedAt: now.toISOString(), total: logs.length, logs }, null, 2));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', (req, res) => {
  const data = readDB();
  const newGroup = { id: uuidv4(), ...req.body };
  data.groups.push(newGroup);
  writeDB(data);
  res.json(newGroup);
});

app.put('/api/groups/:id', (req, res) => {
  const data = readDB();
  const index = data.groups.findIndex((g: any) => g.id === req.params.id);
  if (index !== -1) {
    data.groups[index] = { ...data.groups[index], ...req.body };
    writeDB(data);
    res.json(data.groups[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/progress', (req, res) => {
  const data = readDB();
  const record = { id: uuidv4(), ...req.body };
  data.progress.push(record);
  writeDB(data);
  res.json(record);
});

app.post('/api/materials', (req, res) => {
  const data = readDB();
  const record = { id: uuidv4(), ...req.body };
  data.materials.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/materials/:id', (req, res) => {
  const data = readDB();
  const index = data.materials.findIndex((m: any) => m.id === req.params.id);
  if (index !== -1) {
    data.materials[index] = { ...data.materials[index], ...req.body };
    writeDB(data);
    res.json(data.materials[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/schedules', (req, res) => {
  const data = readDB();
  const record = { id: uuidv4(), ...req.body };
  if (!data.schedules) data.schedules = [];
  data.schedules.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/schedules/:id', (req, res) => {
  const data = readDB();
  if (!data.schedules) data.schedules = [];
  const index = data.schedules.findIndex((s: any) => s.id === req.params.id);
  if (index !== -1) {
    data.schedules[index] = { ...data.schedules[index], ...req.body };
    writeDB(data);
    res.json(data.schedules[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// --- Students API ---
app.post('/api/students', (req, res) => {
  const data = readDB();
  if (!data.students) data.students = [];
  const record = { id: uuidv4(), ...req.body };
  data.students.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/students/:id', (req, res) => {
  const data = readDB();
  if (!data.students) data.students = [];
  const index = data.students.findIndex((s: any) => s.id === req.params.id);
  if (index !== -1) {
    data.students[index] = { ...data.students[index], ...req.body };
    writeDB(data);
    res.json(data.students[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const data = readDB();
  if (!data.students) data.students = [];
  data.students = data.students.filter((s: any) => s.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

// --- Ustadz API ---
app.post('/api/ustadz', (req, res) => {
  const data = readDB();
  if (!data.ustadz) data.ustadz = [];
  const record = { id: uuidv4(), ...req.body };
  data.ustadz.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/ustadz/:id', (req, res) => {
  const data = readDB();
  if (!data.ustadz) data.ustadz = [];
  const index = data.ustadz.findIndex((s: any) => s.id === req.params.id);
  if (index !== -1) {
    data.ustadz[index] = { ...data.ustadz[index], ...req.body };
    writeDB(data);
    res.json(data.ustadz[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/ustadz/:id', (req, res) => {
  const data = readDB();
  if (!data.ustadz) data.ustadz = [];
  data.ustadz = data.ustadz.filter((u: any) => u.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

app.delete('/api/groups/:id', (req, res) => {
  const data = readDB();
  if (!data.groups) data.groups = [];
  data.groups = data.groups.filter((g: any) => g.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

// --- Google OAuth Integration ---
// Fallback if environment variables are missing
const getOAuthSettings = () => {
  const data = readDB();
  return data.oauthSettings || {};
};

const getOAuthClient = (req) => {
  const settings = getOAuthSettings();
  const clientId = settings.clientId || process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID';
  const clientSecret = settings.clientSecret || process.env.GOOGLE_CLIENT_SECRET || 'MISSING_CLIENT_SECRET';

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  // Allow overriding redirect URI for subfolder hosting
  const redirectUri = settings.redirectUri || `${protocol}://${host}/api/auth/callback`;

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

app.get('/api/settings/oauth', (req, res) => {
  const settings = getOAuthSettings();
  res.json({
    clientId: settings.clientId || '',
    clientSecret: settings.clientSecret ? '********' : '', // mask secret
    redirectUri: settings.redirectUri || ''
  });
});

app.post('/api/settings/oauth', (req, res) => {
  const data = readDB();
  if (!data.oauthSettings) data.oauthSettings = {};
  
  const { clientId, clientSecret, redirectUri } = req.body;
  if (clientId !== undefined) data.oauthSettings.clientId = clientId;
  if (clientSecret && clientSecret !== '********') data.oauthSettings.clientSecret = clientSecret;
  if (redirectUri !== undefined) data.oauthSettings.redirectUri = redirectUri;
  
  writeDB(data);
  res.json({ success: true });
});

app.get('/api/auth/url', (req, res) => {
  const settings = getOAuthSettings();
  const clientId = settings.clientId || process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID';
  
  if (clientId === 'MISSING_CLIENT_ID') {
     return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' });
  }

  const oauth2Client = getOAuthClient(req);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
  });
  res.json({ url });
});

app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  const oauth2Client = getOAuthClient(req);
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    const data = readDB();
    data.tokens = tokens;
    writeDB(data);
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

app.get('/api/auth/status', (req, res) => {
    const data = readDB();
    res.json({ connected: !!data.tokens.access_token });
});

// Sync to Google Sheets

// --- Kontakan ---
app.post('/api/kontakan', (req, res) => {
  const data = readDB();
  if (!data.kontakan) data.kontakan = [];
  const record = { id: uuidv4(), ...req.body };
  data.kontakan.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/kontakan/:id', (req, res) => {
  const data = readDB();
  if (!data.kontakan) data.kontakan = [];
  const index = data.kontakan.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    data.kontakan[index] = { ...data.kontakan[index], ...req.body };
    writeDB(data);
    res.json(data.kontakan[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/kontakan/:id/move-to-pelajar', (req, res) => {
  const data = readDB();
  if (!data.kontakan) data.kontakan = [];
  if (!data.students) data.students = [];
  
  const index = data.kontakan.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    // Change status
    data.kontakan[index].status = 'Pelajar';
    
    // Add to students
    const k = data.kontakan[index];
    const newStudent = {
      id: uuidv4(),
      name: k.name,
      origin: k.origin,
      address: k.address,
      phone: k.phone,
      createdBy: k.createdBy
    };
    data.students.push(newStudent);
    
    writeDB(data);
    res.json({ success: true, student: newStudent, kontakan: data.kontakan[index] });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// --- Kontak Schedules ---

app.delete('/api/kontakan/:id', (req, res) => {
  const data = readDB();
  if (!data.kontakan) data.kontakan = [];
  data.kontakan = data.kontakan.filter((s) => s.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

app.post('/api/kontakSchedules', (req, res) => {
  const data = readDB();
  if (!data.kontakSchedules) data.kontakSchedules = [];
  const record = { id: uuidv4(), ...req.body };
  data.kontakSchedules.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/kontakSchedules/:id', (req, res) => {
  const data = readDB();
  if (!data.kontakSchedules) data.kontakSchedules = [];
  const index = data.kontakSchedules.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    data.kontakSchedules[index] = { ...data.kontakSchedules[index], ...req.body };
    writeDB(data);
    res.json(data.kontakSchedules[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/kontakSchedules/:id', (req, res) => {
  const data = readDB();
  if (!data.kontakSchedules) data.kontakSchedules = [];
  data.kontakSchedules = data.kontakSchedules.filter((s) => s.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

// --- Kontak Progress ---
app.post('/api/kontakProgress', (req, res) => {
  const data = readDB();
  if (!data.kontakProgress) data.kontakProgress = [];
  const record = { id: uuidv4(), ...req.body };
  data.kontakProgress.push(record);
  writeDB(data);
  res.json(record);
});

app.delete('/api/kontakProgress/:id', (req, res) => {
  const data = readDB();
  if (!data.kontakProgress) data.kontakProgress = [];
  data.kontakProgress = data.kontakProgress.filter((p: any) => p.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

app.delete('/api/progress/:id', (req, res) => {
  const data = readDB();
  if (!data.progress) data.progress = [];
  data.progress = data.progress.filter((p: any) => p.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

// --- Agenda Events (Kalender Agenda Kegiatan & Rapat/Liqo') ---
app.post('/api/agendaEvents', (req, res) => {
  const data = readDB();
  if (!data.agendaEvents) data.agendaEvents = [];
  const record = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
  data.agendaEvents.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/agendaEvents/:id', (req, res) => {
  const data = readDB();
  if (!data.agendaEvents) data.agendaEvents = [];
  const index = data.agendaEvents.findIndex((e: any) => e.id === req.params.id);
  if (index !== -1) {
    data.agendaEvents[index] = { ...data.agendaEvents[index], ...req.body };
    writeDB(data);
    res.json(data.agendaEvents[index]);
  } else {
    res.status(404).json({ error: 'Agenda Event not found' });
  }
});

app.delete('/api/agendaEvents/:id', (req, res) => {
  const data = readDB();
  if (!data.agendaEvents) data.agendaEvents = [];
  data.agendaEvents = data.agendaEvents.filter((e: any) => e.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

// --- Agenda Progress (Progres Realisasi Agenda & Liqo') ---
app.post('/api/agendaProgress', (req, res) => {
  const data = readDB();
  if (!data.agendaProgress) data.agendaProgress = [];
  const record = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
  data.agendaProgress.push(record);
  writeDB(data);
  res.json(record);
});

app.put('/api/agendaProgress/:id', (req, res) => {
  const data = readDB();
  if (!data.agendaProgress) data.agendaProgress = [];
  const index = data.agendaProgress.findIndex((p: any) => p.id === req.params.id);
  if (index !== -1) {
    data.agendaProgress[index] = { ...data.agendaProgress[index], ...req.body };
    writeDB(data);
    res.json(data.agendaProgress[index]);
  } else {
    res.status(404).json({ error: 'Agenda Progress not found' });
  }
});

app.delete('/api/agendaProgress/:id', (req, res) => {
  const data = readDB();
  if (!data.agendaProgress) data.agendaProgress = [];
  data.agendaProgress = data.agendaProgress.filter((p: any) => p.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});

// --- Universal Batch Import API ---
app.post('/api/batch-import', (req, res) => {
  const { entity, items, actor } = req.body;
  if (!entity || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Data import tidak valid' });
  }

  const validEntities = [
    'students', 
    'ustadz', 
    'kontakan', 
    'progress', 
    'kontakProgress', 
    'schedules', 
    'kontakSchedules', 
    'agendaEvents', 
    'agendaProgress'
  ];

  if (!validEntities.includes(entity)) {
    return res.status(400).json({ error: `Entity "${entity}" tidak didukung` });
  }

  const data = readDB();
  if (!data[entity]) data[entity] = [];

  const createdItems = items.map((item: any) => ({
    id: item.id || uuidv4(),
    ...item
  }));

  data[entity].push(...createdItems);
  writeDB(data);

  logActivity(
    'DATA_IMPORT',
    'IMPORT',
    `Impor Data Massal (${entity})`,
    `Berhasil mengimpor ${createdItems.length} rekaman data ${entity} ke dalam sistem`,
    actor || 'Super Administrator',
    { entity, count: createdItems.length }
  );

  res.json({ success: true, count: createdItems.length, items: createdItems });
});

app.post('/api/sync/sheets', async (req, res) => {
  const data = readDB();
  if (!data.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated with Google' });
  }
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(data.tokens);
  
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  // If spreadsheetId is provided in body, update it, otherwise create
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  
  if (!spreadsheetId) {
      return res.status(500).json({ error: 'Please set GOOGLE_SPREADSHEET_ID in .env' });
  }

  try {
      // Very basic sync: Clear sheet and rewrite
      await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A1',
          valueInputOption: 'RAW',
          requestBody: {
              values: [
                  ['Ustadz', 'Student'],
                  ...data.groups.flatMap((g: any) => g.students.map((s: string) => [g.ustadz, s]))
              ]
          }
      });

      logActivity(
        'GOOGLE_SHEET_SYNC',
        'SYNC',
        'Sinkronisasi Google Sheets',
        'Data kelompok dan pelajar berhasil disinkronkan ke Google Spreadsheet',
        req.body?.actor || 'Super Administrator',
        { spreadsheetId }
      );

      res.json({ success: true, message: 'Synced to Google Sheets successfully' });
  } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
  }
});

// Add Calendar Event
app.post('/api/calendar/add', async (req, res) => {
    const data = readDB();
    if (!data.tokens.access_token) {
        return res.status(401).json({ error: 'Not authenticated with Google' });
    }
    
    const { title, date, description } = req.body;
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(data.tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    try {
        const event = {
            summary: title,
            description: description,
            start: {
                dateTime: new Date(date).toISOString(),
                timeZone: 'Asia/Jakarta',
            },
            end: {
                dateTime: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(),
                timeZone: 'Asia/Jakarta',
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });
        res.json({ success: true, link: response.data.htmlLink });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Backup to Google Drive
app.post('/api/sync/drive', async (req, res) => {
    const data = readDB();
    if (!data.tokens.access_token) {
        return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(data.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
        const fileMetadata = {
            name: `HalaqohApp_Backup_${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json'
        };
        const media = {
            mimeType: 'application/json',
            body: JSON.stringify(data, null, 2)
        };
        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id'
        });

        logActivity(
          'DRIVE_BACKUP',
          'SYNC',
          'Pencadangan ke Google Drive',
          `Berkas cadangan sistem berhasil diunggah ke Google Drive (ID: ${file.data.id})`,
          req.body?.actor || 'Super Administrator',
          { fileId: file.data.id }
        );

        res.json({ success: true, fileId: file.data.id });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// Export CSV
app.get('/api/reports/csv', (req, res) => {
    const data = readDB();
    let csv = 'GroupId,Ustadz,Meeting,Date,Student,Attended\n';
    
    for (const record of data.progress) {
        const group = data.groups.find((g: any) => g.id === record.groupId);
        if (!group) continue;
        
        for (const student of group.students) {
            const attended = record.attendance.includes(student) ? 'Yes' : 'No';
            csv += `${group.id},${group.ustadz},${record.meeting},${record.date},${student},${attended}\n`;
        }
    }

    const actor = (req.query.actor as string) || 'Super Administrator';
    logActivity(
      'DATA_EXPORT',
      'EXPORT',
      'Ekspor Laporan Kehadiran CSV',
      'Rekapitulasi riwayat kehadiran progres halaqoh berhasil diunduh dalam format CSV',
      actor
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    res.send(csv);
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
