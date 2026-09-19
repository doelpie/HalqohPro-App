const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `// --- Google OAuth Integration ---
// Fallback if environment variables are missing
const getOAuthSettings = () => {
  const data = readDB();
  return data.oauthSettings || {};
};

const getOAuthClient = (req: express.Request) => {
  const settings = getOAuthSettings();
  const clientId = settings.clientId || process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID';
  const clientSecret = settings.clientSecret || process.env.GOOGLE_CLIENT_SECRET || 'MISSING_CLIENT_SECRET';

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  // Allow overriding redirect URI for subfolder hosting
  const redirectUri = settings.redirectUri || \`\${protocol}://\${host}/api/auth/callback\`;

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
`;

code = code.replace(/\/\/ --- Google OAuth Integration ---\n.*?app\.get\('\/api\/auth\/url', \(req, res\) => {\n  if \(OAUTH_CLIENT_ID === 'MISSING_CLIENT_ID'\) {\n     return res\.status\(500\)\.json\({ error: 'Missing GOOGLE_CLIENT_ID environment variable' }\);\n  }/s, replacement);

fs.writeFileSync('server.ts', code);
