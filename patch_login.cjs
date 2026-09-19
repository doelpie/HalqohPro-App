const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

const keydownFunction = `
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
`;

code = code.replace(/const handleSubmit = async/, keydownFunction + '\n  const handleSubmit = async');
code = code.replace(/value=\{username\}\n              onChange=\{e => setUsername\(e.target.value\)\}/, `value={username}\n              onChange={e => setUsername(e.target.value)}\n              onKeyDown={handleKeyDown}`);
code = code.replace(/value=\{password\}\n              onChange=\{e => setPassword\(e.target.value\)\}/, `value={password}\n              onChange={e => setPassword(e.target.value)}\n              onKeyDown={handleKeyDown}`);

fs.writeFileSync('src/components/Login.tsx', code);
