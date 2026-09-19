const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code += `
export interface Kontakan {
  id: string;
  name: string;
  origin: string;
  address: string;
  phone: string;
  createdBy: string;
  status: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'Pelajar';
}

export interface KontakSchedule {
  id: string;
  kontakanId: string;
  date: string;
  time: string;
  title: string;
  description: string;
}

export interface KontakProgress {
  id: string;
  kontakanId: string;
  date: string;
  pembahasan: string;
  notes: string;
  createdBy: string;
}
`;

fs.writeFileSync('src/types.ts', code);
