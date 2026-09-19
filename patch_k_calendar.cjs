const fs = require('fs');
let code = fs.readFileSync('src/components/KontakCalendarPanel.tsx', 'utf8');

// Replace standard variables
code = code.replace(/CalendarPanel/g, 'KontakCalendarPanel');
code = code.replace(/Schedule/g, 'KontakSchedule');
code = code.replace(/schedules/g, 'kontakSchedules');
code = code.replace(/groupId/g, 'kontakanId');
code = code.replace(/setGroupId/g, 'setKontakanId');
code = code.replace(/groups/g, 'kontakan');
code = code.replace(/Group/g, 'Kontakan');

// Change Title
code = code.replace(/>Kalender Kajian</g, '>Kalender Plan Kontak<');
code = code.replace(/>5 Kajian Mendatang</g, '>5 Plan Kontak Mendatang<');
code = code.replace(/>Tidak ada jadwal kajian mendatang\.</g, '>Tidak ada plan kontak mendatang.<');
code = code.replace(/>Judul Kajian</g, '>Judul Plan Kontak<');
code = code.replace(/Ust \{group\?\.ustadz\}/g, '{group?.name}');
code = code.replace(/Ustadz \{g\.ustadz\}/g, '{g.name}');
code = code.replace(/Kalender Kajian/g, 'Kalender Plan Kontak');

// Displayed groups logic change
code = code.replace(/const displayedGroups = kontakan\.filter\(g => user\.role === 'Super Administrator' \|\| g\.ustadz === user\.ustadzName\);/, 
  `const displayedGroups = kontakan.filter(g => user.role === 'Super Administrator' || g.createdBy === user.ustadzName);`);

code = code.replace(/const getUpcomingSchedules = \(\) => \{.*?return future\.sort/s, 
  `const getUpcomingSchedules = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const future = kontakSchedules.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= today && (user.role === 'Super Administrator' || kontakan.find(g => g.id === s.kontakanId)?.createdBy === user.ustadzName);
    });
    return future.sort`);

code = code.replace(/return kontakSchedules\.filter\(s => s\.date === dateStr && \(user\.role === 'Super Administrator' \|\| kontakan\.find\(g => g\.id === s\.kontakanId\)\?\.ustadz === user\.ustadzName\)\);/,
  `return kontakSchedules.filter(s => s.date === dateStr && (user.role === 'Super Administrator' || kontakan.find(g => g.id === s.kontakanId)?.createdBy === user.ustadzName));`);

code = code.replace(/<label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kelompok<\/label>/,
  `<label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Kontakan<\/label>`);

fs.writeFileSync('src/components/KontakCalendarPanel.tsx', code);
