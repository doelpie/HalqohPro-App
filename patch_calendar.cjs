const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarPanel.tsx', 'utf8');

const replacement = `
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
`;

// upcoming logic
const upcomingLogic = `
  const getUpcomingSchedules = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const future = schedules.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= today && (user.role === 'Super Administrator' || groups.find(g => g.id === s.groupId)?.ustadz === user.ustadzName);
    });
    return future.sort((a,b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    }).slice(0, 5);
  };
  const upcoming = getUpcomingSchedules();
`;
code = code.replace(/return \(\s*<div className="flex flex-col gap-6">/, upcomingLogic + '\n  return (\n    <div className="flex flex-col gap-6">');

const upcomingRender = `
        <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">5 Kajian Mendatang</h3>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map(s => {
                const group = groups.find(g => g.id === s.groupId);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{s.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Ust {group?.ustadz} • {s.description || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 text-sm">{new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">{s.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Tidak ada jadwal kajian mendatang.</p>
          )}
        </div>
      </div>
`;
code = code.replace(/<\/div>\s*<\/div>\s*\{isModalOpen && \(/, '</div>\n        </div>\n' + upcomingRender + '\n      {isModalOpen && (');

fs.writeFileSync('src/components/CalendarPanel.tsx', code);
