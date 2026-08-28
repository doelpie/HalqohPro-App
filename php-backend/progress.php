<?php
require_once 'header.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add') {
        $student_id = $_POST['student_id'] ?? 0;
        $material_id = $_POST['material_id'] ?? 0;
        $status = $_POST['status'] ?? '';
        $date = $_POST['date'] ?? date('Y-m-d');
        $notes = $_POST['notes'] ?? '';
        $ustadz = $current_ustadz;
        
        if ($student_id && $material_id) {
            $stmt = $conn->prepare("INSERT INTO progress (student_id, material_id, status, date, notes, ustadz) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iissss", $student_id, $material_id, $status, $date, $notes, $ustadz);
            $stmt->execute();
        }
    } else if ($action === 'delete') {
        if ($current_role === 'Super Administrator') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM progress WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    header('Location: progress.php');
    exit;
}

// Fetch available students for the Ustadz
if ($current_role === 'Super Administrator') {
    $studentResult = $conn->query("SELECT * FROM students");
} else {
    // Only students in groups of this ustadz
    $stmt = $conn->prepare("
        SELECT s.* FROM students s
        JOIN group_students gs ON s.id = gs.student_id
        JOIN halaqoh_groups g ON gs.group_id = g.id
        JOIN ustadz u ON g.ustadz_id = u.id
        WHERE u.name = ?
    ");
    $stmt->bind_param("s", $current_ustadz);
    $stmt->execute();
    $studentResult = $stmt->get_result();
}
$students = $studentResult->fetch_all(MYSQLI_ASSOC);

$materialResult = $conn->query("SELECT * FROM materials ORDER BY type, title");
$materials = $materialResult->fetch_all(MYSQLI_ASSOC);

// Fetch Progress
$progResult = $conn->query("
    SELECT p.*, s.name as student_name, m.title as material_title, m.type as material_type
    FROM progress p
    JOIN students s ON p.student_id = s.id
    JOIN materials m ON p.material_id = m.id
    ORDER BY p.date DESC LIMIT 50
");
$progressData = $progResult->fetch_all(MYSQLI_ASSOC);
// Filter progress if Ustadz
if ($current_role !== 'Super Administrator') {
    $progressData = array_filter($progressData, fn($p) => $p['ustadz'] === $current_ustadz);
}
?>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col mb-6">
    <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Catat Perkembangan Baru</h3>
    <form method="POST" class="space-y-4">
        <input type="hidden" name="action" value="add">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Pelajar</label>
                <select name="student_id" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
                    <option value="">-- Pilih --</option>
                    <?php foreach($students as $s): ?>
                        <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Materi</label>
                <select name="material_id" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
                    <option value="">-- Pilih --</option>
                    <?php foreach($materials as $m): ?>
                        <option value="<?= $m['id'] ?>"><?= htmlspecialchars($m['type']) ?>: <?= htmlspecialchars($m['title']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Status Penilaian</label>
                <select name="status" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
                    <option value="Lancar (Mumtaz)">Lancar (Mumtaz)</option>
                    <option value="Kurang Lancar (Jayyid)">Kurang Lancar (Jayyid)</option>
                    <option value="Perlu Diulang">Perlu Diulang</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input type="date" name="date" required value="<?= date('Y-m-d') ?>" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
            </div>
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Catatan Ustadz</label>
            <input type="text" name="notes" placeholder="Catatan opsional..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
        </div>
        <button type="submit" class="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Simpan Perkembangan</button>
    </form>
</div>

<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left">
        <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-sm">
            <tr>
                <th class="px-4 py-3">Pelajar</th>
                <th class="px-4 py-3">Materi</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Tanggal</th>
                <th class="px-4 py-3">Catatan</th>
                <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-sm">
            <?php foreach($progressData as $p): ?>
            <?php 
                $statusColors = [
                    'Lancar (Mumtaz)' => 'bg-emerald-100 text-emerald-700 border-emerald-200',
                    'Kurang Lancar (Jayyid)' => 'bg-blue-100 text-blue-700 border-blue-200',
                    'Perlu Diulang' => 'bg-red-100 text-red-700 border-red-200'
                ];
                $color = $statusColors[$p['status']] ?? 'bg-slate-100 text-slate-700 border-slate-200';
            ?>
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-bold text-slate-800"><?= htmlspecialchars($p['student_name']) ?></td>
                <td class="px-4 py-3">
                    <span class="text-xs font-bold text-slate-500 uppercase"><?= htmlspecialchars($p['material_type']) ?></span><br>
                    <span class="text-slate-700 font-medium"><?= htmlspecialchars($p['material_title']) ?></span>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs font-bold rounded-md border <?= $color ?>"><?= htmlspecialchars($p['status']) ?></span>
                </td>
                <td class="px-4 py-3 text-slate-500"><?= htmlspecialchars($p['date']) ?></td>
                <td class="px-4 py-3 text-slate-600 italic"><?= htmlspecialchars($p['notes']) ?></td>
                <td class="px-4 py-3 text-right">
                    <?php if ($current_role === 'Super Administrator'): ?>
                    <form method="POST" class="inline">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $p['id'] ?>">
                        <button type="submit" onclick="return confirm('Yakin hapus?');" class="text-red-500 hover:text-red-700"><i class="fas fa-trash-alt"></i></button>
                    </form>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php require_once 'footer.php'; ?>
