<?php
require_once 'header.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add') {
        $title = $_POST['title'] ?? '';
        $type = $_POST['type'] ?? 'Hafalan';
        $target = $_POST['target'] ?? '';
        
        if ($title) {
            $stmt = $conn->prepare("INSERT INTO materials (title, type, target) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $title, $type, $target);
            $stmt->execute();
        }
    } else if ($action === 'delete') {
        if ($current_role === 'Super Administrator') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM materials WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    header('Location: materials.php');
    exit;
}

$res = $conn->query("SELECT * FROM materials ORDER BY type, title");
$materials = $res->fetch_all(MYSQLI_ASSOC);
?>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col mb-6">
    <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Materi</h3>
    <form method="POST" class="grid gap-4 md:grid-cols-4 items-end">
        <input type="hidden" name="action" value="add">
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Tipe Materi</label>
            <select name="type" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
                <option value="Hafalan">Hafalan</option>
                <option value="Tilawah">Tilawah</option>
                <option value="Murojaah">Murojaah</option>
            </select>
        </div>
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Judul Kitab/Surat</label>
            <input type="text" name="title" required placeholder="Contoh: Al-Baqarah" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
        </div>
        <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Target</label>
            <input type="text" name="target" placeholder="Contoh: Juz 1-5" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
        </div>
        <div class="md:col-span-1">
            <button type="submit" class="w-full px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm h-[38px]">
                Simpan Materi
            </button>
        </div>
    </form>
</div>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <?php
    $types = ['Hafalan' => 'emerald', 'Tilawah' => 'blue', 'Murojaah' => 'purple'];
    foreach ($types as $type => $color):
        $typeMaterials = array_filter($materials, fn($m) => $m['type'] === $type);
    ?>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
        <div class="bg-<?= $color ?>-50 p-4 border-b border-<?= $color ?>-100 flex items-center justify-between">
            <h3 class="font-bold text-<?= $color ?>-800"><?= $type ?></h3>
            <span class="bg-<?= $color ?>-200 text-<?= $color ?>-800 text-xs font-bold px-2 py-1 rounded-md"><?= count($typeMaterials) ?></span>
        </div>
        <div class="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50">
            <?php foreach($typeMaterials as $m): ?>
            <div class="bg-white p-3 rounded-lg border border-slate-200 flex flex-col">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-slate-800 text-sm"><?= htmlspecialchars($m['title']) ?></h4>
                    <?php if ($current_role === 'Super Administrator'): ?>
                    <form method="POST">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $m['id'] ?>">
                        <button type="submit" onclick="return confirm('Yakin hapus?');" class="text-red-400 hover:text-red-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </form>
                    <?php endif; ?>
                </div>
                <?php if($m['target']): ?>
                <div class="text-xs text-slate-500 font-medium">Target: <?= htmlspecialchars($m['target']) ?></div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<?php require_once 'footer.php'; ?>
