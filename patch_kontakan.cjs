const fs = require('fs');
let code = fs.readFileSync('src/components/KontakanPanel.tsx', 'utf8');

// Replace standard variables
code = code.replace(/Student/g, 'Kontakan');
code = code.replace(/students/g, 'kontakan');
code = code.replace(/Pelajar/g, 'Kontakan');
code = code.replace(/pelajar/g, 'kontakan');

// Imports
code = code.replace(/import \{ Kontakan \} from '\.\.\/types';/, `import { Kontakan } from '../types';\nimport { UserCheck } from 'lucide-react';`);

// State for status
code = code.replace(/const \[phone, setPhone\] = useState\(''\);/, `const [phone, setPhone] = useState('');\n  const [status, setStatus] = useState<Kontakan['status']>('S0');`);

// Payload for save
code = code.replace(/      phone,\n      createdBy/, `      phone,\n      status,\n      createdBy`);

// resetForm
code = code.replace(/setPhone\(''\);\n  \};/, `setPhone('');\n    setStatus('S0');\n  };`);

// startEdit
code = code.replace(/setPhone\(student\.phone \|\| ''\);/, `setPhone(student.phone || '');\n    setStatus(student.status || 'S0');`);

// Add form field for status
code = code.replace(/            <div>\n              <label className="block text-sm font-semibold text-slate-700 mb-1">Daerah Asal<\/label>/, `            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status Kontakan</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Kontakan['status'])}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              >
                <option value="S0">S0</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
                <option value="Pelajar">Pelajar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Daerah Asal</label>`);

// Add column for status
code = code.replace(/<th className="px-6 py-4">Nomor HP WA<\/th>/, `<th className="px-6 py-4">Nomor HP WA</th>\n                <th className="px-6 py-4">Status</th>`);

// Add row for status & Move action
code = code.replace(/<td className="px-6 py-4">\{student\.phone \|\| '-'\}.*?<\/td>/s, `<td className="px-6 py-4">{student.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                        {student.status || 'S0'}
                      </span>
                    </td>`);

code = code.replace(/\{canEdit\(student\) && \(/, `{canEdit(student) && student.status !== 'Pelajar' && (
                          <button
                            onClick={() => handleMoveToPelajar(student.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Ubah Status ke Pelajar"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit(student) && (`);

// Add handleMoveToPelajar function
const moveFunc = `
  const handleMoveToPelajar = async (id: string) => {
    if (!confirm('Yakin ingin mengubah status kontakan ini menjadi Pelajar? Data akan dipindahkan ke Daftar Pelajar.')) return;
    await fetch(\`/api/kontakan/\${id}/move-to-pelajar\`, { method: 'POST' });
    refresh();
  };
`;
code = code.replace(/const handleDelete =/, moveFunc + '\n  const handleDelete =');

// Rename component
code = code.replace(/export default function StudentsPanel\(\{ kontakan, /g, `export default function KontakanPanel({ kontakan, `);
code = code.replace(/export default function KontakanPanel\(\{ kontakan, groups, refresh, user \}: \{ kontakan: Kontakan\[\], groups: Group\[\], refresh: \(\) => void, user: User \}\) \{/, `import { Group, User } from '../types';\nexport default function KontakanPanel({ kontakan, refresh, user }: { kontakan: Kontakan[], refresh: () => void, user: User }) {`);
// StudentsPanel expects groups too, so we can remove groups from props since we don't use it here.
code = code.replace(/const filteredStudents = kontakan\.filter/, `const filteredKontakan = kontakan.filter`);
code = code.replace(/filteredStudents\.length/, `filteredKontakan.length`);
code = code.replace(/filteredStudents\.map/, `filteredKontakan.map`);

fs.writeFileSync('src/components/KontakanPanel.tsx', code);
