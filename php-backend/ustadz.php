<?php
require_once 'config.php';

$current_role = $_SESSION['role'] ?? 'Super Administrator';
$current_ustadz = $_SESSION['ustadz_name'] ?? 'Ustadz Fulan';

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
        } else if ($action === 'edit') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("UPDATE ustadz SET name=?, origin=?, address=?, phone=? WHERE id=?");
            $stmt->bind_param("ssssi", $name, $origin, $address, $phone, $id);
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
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Daftar Ustadz</title>
    <style>
        body { font-family: sans-serif; padding: 2rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .form-group { margin-bottom: 10px; }
        input[type="text"] { width: 100%; padding: 5px; }
        button { padding: 5px 10px; }
    </style>
</head>
<body>
    <h1>Daftar Ustadz</h1>
    <a href="index.php">Kembali ke Beranda</a>
    <hr>
    
    <h3>Tambah Ustadz</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="form-group"><label>Nama Ustadz</label><input type="text" name="name" required></div>
        <div class="form-group"><label>Daerah Asal</label><input type="text" name="origin"></div>
        <div class="form-group"><label>Alamat Tinggal</label><input type="text" name="address"></div>
        <div class="form-group"><label>Nomor HP WA</label><input type="text" name="phone"></div>
        <button type="submit">Simpan</button>
    </form>

    <hr>
    <h3>Data Ustadz</h3>
    <table>
        <tr>
            <th>Nama</th>
            <th>Daerah Asal</th>
            <th>Alamat</th>
            <th>Nomor HP</th>
            <th>Aksi</th>
        </tr>
        <?php foreach($ustadzList as $u): ?>
        <?php 
            $can_edit = ($current_role === 'Super Administrator' || $u['name'] === $current_ustadz);
            $can_delete = ($current_role === 'Super Administrator');
        ?>
        <tr>
            <td><?= htmlspecialchars($u['name']) ?></td>
            <td><?= htmlspecialchars($u['origin']) ?></td>
            <td><?= htmlspecialchars($u['address']) ?></td>
            <td><?= htmlspecialchars($u['phone']) ?></td>
            <td>
                <?php if ($can_edit): ?>
                    <!-- Edit functionality logic goes here if implemented -->
                <?php endif; ?>
                <?php if ($can_delete): ?>
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= $u['id'] ?>">
                    <button type="submit" onclick="return confirm('Yakin hapus?');">Hapus</button>
                </form>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>
