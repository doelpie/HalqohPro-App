const fs = require('fs');
let code = fs.readFileSync('src/components/KontakanPanel.tsx', 'utf8');

const replacement = `
  const canEdit = (k: Kontakan) => {
    if (user.role === 'Super Administrator') return true;
    if (k.createdBy === user.ustadzName) return true;
    return false;
  };

  const canDelete = () => {
    return user.role === 'Super Administrator';
  };
`;

code = code.replace(/const canEdit =.*?const canDelete = \(\) => \{.*?return user\.role === 'Super Administrator';\n  \};/s, replacement);

code = code.replace(/canEdit\(student\)/g, 'canEdit(k)');

fs.writeFileSync('src/components/KontakanPanel.tsx', code);
