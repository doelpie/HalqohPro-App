const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const deleteKontakanEndpoint = `
app.delete('/api/kontakan/:id', (req, res) => {
  const data = readDB();
  if (!data.kontakan) data.kontakan = [];
  data.kontakan = data.kontakan.filter((s) => s.id !== req.params.id);
  writeDB(data);
  res.json({ success: true });
});
`;

code = code.replace(/app\.post\('\/api\/kontakSchedules',/, deleteKontakanEndpoint + '\napp.post(\'/api/kontakSchedules\',');

fs.writeFileSync('server.ts', code);
