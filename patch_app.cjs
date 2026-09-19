const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
code = code.replace(/import UstadzPanel from '\.\/components\/UstadzPanel';/, 
  `import UstadzPanel from './components/UstadzPanel';
import KontakanPanel from './components/KontakanPanel';
import KontakCalendarPanel from './components/KontakCalendarPanel';
import KontakProgressPanel from './components/KontakProgressPanel';`);

code = code.replace(/import \{ Group, Material, Progress, Schedule, User, Student, Ustadz \} from '\.\/types';/,
  `import { Group, Material, Progress, Schedule, User, Student, Ustadz, Kontakan, KontakSchedule, KontakProgress } from './types';`);

code = code.replace(/GraduationCap, UserCheck, Key \} from 'lucide-react';/,
  `GraduationCap, UserCheck, Key, PhoneCall, CalendarHeart, TrendingUp } from 'lucide-react';`);

// State
code = code.replace(/const \[activeTab, setActiveTab\] = useState<'progress' \| 'calendar' \| 'groups' \| 'materials' \| 'students' \| 'ustadz' \| 'sync'>\('progress'\);/,
  `const [activeTab, setActiveTab] = useState<'progress' | 'calendar' | 'groups' | 'materials' | 'students' | 'ustadz' | 'sync' | 'kontakan' | 'kontak-calendar' | 'kontak-progress'>('progress');`);

code = code.replace(/const \[data, setData\] = useState<\{ groups: Group\[\], materials: Material\[\], progress: Progress\[\], schedules: Schedule\[\], students: Student\[\], ustadz: Ustadz\[\] \} \| null>\(null\);/,
  `const [data, setData] = useState<{ groups: Group[], materials: Material[], progress: Progress[], schedules: Schedule[], students: Student[], ustadz: Ustadz[], kontakan: Kontakan[], kontakSchedules: KontakSchedule[], kontakProgress: KontakProgress[] } | null>(null);`);

// Tabs
const newTabs = `
    { id: 'progress', label: 'Progres', icon: <Activity className="w-4 h-4 mr-2" />, show: true },
    { id: 'calendar', label: 'Kalendar Kajian', icon: <Calendar className="w-4 h-4 mr-2" />, show: true },
    { id: 'groups', label: 'Kelompok', icon: <Users className="w-4 h-4 mr-2" />, show: true },
    { id: 'materials', label: 'Materi', icon: <BookOpen className="w-4 h-4 mr-2" />, show: true },
    { id: 'students', label: 'Daftar Pelajar', icon: <GraduationCap className="w-4 h-4 mr-2" />, show: true },
    { id: 'ustadz', label: 'Daftar Ustadz', icon: <UserCheck className="w-4 h-4 mr-2" />, show: true },
    { id: 'kontakan', label: 'Daftar Kontakan', icon: <PhoneCall className="w-4 h-4 mr-2" />, show: true },
    { id: 'kontak-calendar', label: 'Kalender Plan Kontak', icon: <CalendarHeart className="w-4 h-4 mr-2" />, show: true },
    { id: 'kontak-progress', label: 'Progres Kontak', icon: <TrendingUp className="w-4 h-4 mr-2" />, show: true },
    { id: 'sync', label: 'Integrasi', icon: <Settings className="w-4 h-4 mr-2" />, show: user.role === 'Super Administrator' },
`;
code = code.replace(/const tabs = \[.*?\] as const;/s, `const tabs = [${newTabs}] as const;`);

// Content rendering
const newContent = `
            {activeTab === 'progress' && <ProgressPanel groups={data.groups} materials={data.materials} progress={data.progress} refresh={loadData} user={user} />}
            {activeTab === 'calendar' && <CalendarPanel groups={data.groups} schedules={data.schedules} refresh={loadData} user={user} />}
            {activeTab === 'groups' && <GroupsPanel groups={data.groups} students={data.students} ustadzList={data.ustadz} refresh={loadData} user={user} changeTab={setActiveTab} />}
            {activeTab === 'materials' && <MaterialsPanel materials={data.materials} refresh={loadData} user={user} />}
            {activeTab === 'students' && <StudentsPanel students={data.students} groups={data.groups} refresh={loadData} user={user} />}
            {activeTab === 'ustadz' && <UstadzPanel ustadzList={data.ustadz} refresh={loadData} user={user} />}
            {activeTab === 'kontakan' && <KontakanPanel kontakan={data.kontakan} refresh={loadData} user={user} />}
            {activeTab === 'kontak-calendar' && <KontakCalendarPanel kontakan={data.kontakan} kontakSchedules={data.kontakSchedules} refresh={loadData} user={user} />}
            {activeTab === 'kontak-progress' && <KontakProgressPanel kontakan={data.kontakan} kontakProgress={data.kontakProgress} refresh={loadData} user={user} />}
            {activeTab === 'sync' && <SyncPanel />}
`;
code = code.replace(/\{activeTab === 'progress'.*?\{activeTab === 'sync' && <SyncPanel \/>\}/s, newContent);

fs.writeFileSync('src/App.tsx', code);
