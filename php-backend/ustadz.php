<?php
require_once 'header.php';

// Fitur Daftar Ustadz (CRUD)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add' || $action === 'edit') {
        $name = $_POST['name'] ?? '';
        $origin = $_POST['origin'] ?? '';
        $address = $_POST['address'] ?? '';
        $phone = $_POST['phone'] ?? '';

        if ($action === 'add') {
            $stmt = $conn->prepare("INSERT INTO ustadz (name, origin, address, phone) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $name, $origin, $address, $phone);
            $stmt->execute();
        }
    } else if ($action === 'delete') {
        if ($current_role === 'Super Administrator') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM ustadz WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    
    header('Location: ustadz.php');
    exit;
}

$result = $conn->query("SELECT * FROM ustadz");
$ustadzList = $result->fetch_all(MYSQLI_ASSOC);
?>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
    <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Ustadz</h3>
    <form method="POST" class="space-y-4">
        <input type="hidden" name="action" value="add">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nama Ustadz</label>
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
        <button type="submit" class="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Simpan Ustadz</button>
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
            <?php foreach($ustadzList as $u): ?>
            <?php 
                $can_delete = ($current_role === 'Super Administrator');
            ?>
            <tr class="hover:bg-slate-50">
                <td class="px-6 py-4 font-bold text-slate-800"><?= htmlspecialchars($u['name']) ?></td>
                <td class="px-6 py-4 text-sm text-slate-600"><?= htmlspecialchars($u['origin']) ?></td>
                <td class="px-6 py-4 text-sm text-slate-600"><?= htmlspecialchars($u['address']) ?></td>
                <td class="px-6 py-4 text-sm text-slate-600"><?= htmlspecialchars($u['phone']) ?></td>
                <td class="px-6 py-4 text-right">
                    <?php if ($can_delete): ?>
                    <form method="POST" class="inline">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $u['id'] ?>">
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
