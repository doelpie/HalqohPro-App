<?php
require_once 'header.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add') {
        $group_id = $_POST['group_id'] ?? 0;
        $day = $_POST['day'] ?? '';
        $time = $_POST['time'] ?? '';
        $type = $_POST['type'] ?? '';
        
        if ($group_id && $day && $time) {
            $stmt = $conn->prepare("INSERT INTO schedules (group_id, day, time, type) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("isss", $group_id, $day, $time, $type);
            $stmt->execute();
        }
    } else if ($action === 'delete') {
        if ($current_role === 'Super Administrator') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM schedules WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    header('Location: calendar.php');
    exit;
}

$groupResult = $conn->query("
    SELECT g.id, u.name as ustadz_name 
    FROM halaqoh_groups g 
    JOIN ustadz u ON g.ustadz_id = u.id
");
$groups = $groupResult->fetch_all(MYSQLI_ASSOC);

$scheduleResult = $conn->query("
    SELECT s.*, u.name as ustadz_name
    FROM schedules s
    JOIN halaqoh_groups g ON s.group_id = g.id
    JOIN ustadz u ON g.ustadz_id = u.id
");
$schedules = $scheduleResult->fetch_all(MYSQLI_ASSOC);
?>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col mb-6">
    <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Jadwal</h3>
    <form method="POST" class="grid gap-4 md:grid-cols-5 items-end">
        <input type="hidden" name="action" value="add">
        
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Kelompok Ustadz</label>
            <select name="group_id" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none text-sm">
                <option value="">-- Pilih --</option>
                <?php foreach($groups as $g): ?>
                    <?php if ($current_role === 'Super Administrator' || $g['ustadz_name'] === $current_ustadz): ?>
                        <option value="<?= $g['id'] ?>"><?= htmlspecialchars($g['ustadz_name']) ?></option>
                    <?php endif; ?>
                <?php endforeach; ?>
            </select>
        </div>
        
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Hari</label>
            <select name="day" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none text-sm">
                <option value="Senin">Senin</option><option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option><option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option><option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
            </select>
        </div>
        
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Waktu / Jam</label>
            <input type="text" name="time" placeholder="16:00 - 17:30" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
        </div>
        
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Kegiatan</label>
            <select name="type" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none text-sm">
                <option value="Setoran Hafalan">Setoran Hafalan</option>
                <option value="Murojaah Bersama">Murojaah Bersama</option>
                <option value="Kajian Kitab">Kajian Kitab</option>
            </select>
        </div>
        
        <div class="md:col-span-1">
            <button type="submit" class="w-full px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm h-[38px]">
                Buat Jadwal
            </button>
        </div>
    </form>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <?php 
    $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    foreach($days as $day):
        $daySchedules = array_filter($schedules, fn($s) => $s['day'] === $day && ($current_role === 'Super Administrator' || $s['ustadz_name'] === $current_ustadz));
        if (empty($daySchedules)) continue;
    ?>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[250px]">
        <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
            <span><?= $day ?></span>
            <span class="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-md"><?= count($daySchedules) ?></span>
        </div>
        <div class="p-4 flex-1 space-y-3 bg-slate-50/50">
            <?php foreach($daySchedules as $s): ?>
            <div class="bg-white border border-slate-200 p-3 rounded-lg shadow-sm border-l-4 border-l-emerald-500 relative">
                <?php if ($current_role === 'Super Administrator'): ?>
                <form method="POST" class="absolute top-2 right-2">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= $s['id'] ?>">
                    <button type="submit" onclick="return confirm('Yakin?');" class="text-red-400 hover:text-red-600"><i class="fas fa-times text-xs"></i></button>
                </form>
                <?php endif; ?>
                <div class="font-bold text-slate-800 text-sm mb-1"><?= htmlspecialchars($s['time']) ?></div>
                <div class="text-xs text-emerald-600 font-semibold mb-1"><?= htmlspecialchars($s['type']) ?></div>
                <div class="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <i class="fas fa-user-tie"></i> Ustadz <?= htmlspecialchars($s['ustadz_name']) ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<?php require_once 'footer.php'; ?>
