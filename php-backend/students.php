<?php
require_once 'header.php';

// Fitur Daftar Pelajar (CRUD)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add' || $action === 'edit') {
        $name = $_POST['name'] ?? '';
        $origin = $_POST['origin'] ?? '';
        $address = $_POST['address'] ?? '';
        $phone = $_POST['phone'] ?? '';
        $created_by = $current_ustadz;

        if ($action === 'add') {
            $stmt = $conn->prepare("INSERT INTO students (name, origin, address, phone, created_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssss", $name, $origin, $address, $phone, $created_by);
            $stmt->execute();
        } else if ($action === 'edit') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("UPDATE students SET name=?, origin=?, address=?, phone=? WHERE id=?");
            $stmt->bind_param("ssssi", $name, $origin, $address, $phone, $id);
            $stmt->execute();
        }
    } else if ($action === 'delete') {
        if ($current_role === 'Super Administrator') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM students WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    
    header('Location: students.php');
    exit;
}

$result = $conn->query("SELECT * FROM students");
$students = $result->fetch_all(MYSQLI_ASSOC);
?>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
    <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Pelajar</h3>
    <form method="POST" class="space-y-4">
        <input type="hidden" name="action" value="add">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nama Pelajar</label>
                <input type="text" name="name" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Daerah Asal</label>
                <input type="text" name="origin" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Alamat Tinggal</label>
                <input type="text" name="address" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nomor HP / WA</label>
                <input type="text" name="phone" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
            </div>
        </div>
        <button type="submit" class="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Simpan Pelajar</button>
    </form>
</div>

<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left">
        <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
                <th class="px-6 py-4">Nama</th>
                <th class="px-6 py-4">Daerah Asal</th>
                <th class="px-6 py-4">Alamat</th>
                <th class="px-6 py-4">Nomor HP</th>
                <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            <?php foreach($students as $s): ?>
            <?php 
                $can_delete = ($current_role === 'Super Administrator');
            ?>
            <tr class="hover:bg-slate-50">
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800"><?= htmlspecialchars($s['name']) ?></div>
                    <div class="text-xs text-slate-400">Ditambahkan oleh: <?= htmlspecialchars($s['created_by']) ?></div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600"><?= htmlspecialchars($s['origin']) ?></td>
                <td class="px-6 py-4 text-sm text-slate-600"><?= htmlspecialchars($s['address']) ?></td>
                <td class="px-6 py-4 text-sm text-slate-600"><?= htmlspecialchars($s['phone']) ?></td>
                <td class="px-6 py-4 text-right">
                    <?php if ($can_delete): ?>
                    <form method="POST" class="inline">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $s['id'] ?>">
                        <button type="submit" onclick="return confirm('Yakin hapus?');" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </form>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php require_once 'footer.php'; ?>
