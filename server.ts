import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// --- Database Simulation ---
const DB_FILE = path.join(process.cwd(), 'database.json');

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
  tokens: {}, // Google OAuth tokens
  users: [
    { id: 'u1', username: 'Admin Teguh', password: '@Teguh9495', role: 'Super Administrator', ustadzName: 'Teguh' },
    { id: 'u2', username: 'Ustadz Margo', password: '@000MuslimBali', role: 'Super Administrator', ustadzName: 'Margo' },
    { id: 'u3', username: 'Ustadz Adi', password: '@000MuslimBali', role: 'Ustadz', ustadzName: 'Adi' },
    { id: 'u4', username: 'Ustadz Ahmad Surya', password: '@000MuslimBali', role: 'Ustadz', ustadzName: 'Ahmad Surya' }
  ]
};

function readDB() {
  if (fs.existsSync(DB_FILE)) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.users) {
      data.users = defaultData.users;
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

app.get('/api/data', (req, res) => {
  const data = readDB();
  res.json({ groups: data.groups, materials: data.materials, progress: data.progress, schedules: data.schedules || [] });
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

// --- Google OAuth Integration ---
// Fallback if environment variables are missing
const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID';
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'MISSING_CLIENT_SECRET';

const getOAuthClient = (req: express.Request) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/callback`;
  return new google.auth.OAuth2(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    redirectUri
  );
};

app.get('/api/auth/url', (req, res) => {
  if (OAUTH_CLIENT_ID === 'MISSING_CLIENT_ID') {
     return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID environment variable' });
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
            name: `HalaqohPro_Backup_${new Date().toISOString().split('T')[0]}.json`,
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
