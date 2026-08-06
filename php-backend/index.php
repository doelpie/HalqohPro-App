<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['set_role'])) {
    $_SESSION['role'] = $_POST['role'];
    $_SESSION['ustadz_name'] = $_POST['ustadz_name'];
}

$current_role = $_SESSION['role'] ?? 'Super Administrator';
$current_ustadz = $_SESSION['ustadz_name'] ?? 'Ustadz Fulan';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aplikasi Halaqoh (PHP & MySQL)</title>
    <style>
        body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        .card { border: 1px solid #ccc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .btn-success { background: #28a745; }
    </style>
</head>
<body>
    <h1>Aplikasi Halaqoh (Versi PHP/MySQL)</h1>
    <p>Ini adalah kerangka dasar aplikasi jika dijalankan di CPanel menggunakan PHP dan MySQL.</p>
    
    <div class="card">
        <h2>Simulasi Role</h2>
        <form method="POST">
            <input type="hidden" name="set_role" value="1">
            Role: 
            <select name="role">
                <option value="Super Administrator" <?= $current_role === 'Super Administrator' ? 'selected' : '' ?>>Super Administrator</option>
                <option value="Ustadz" <?= $current_role === 'Ustadz' ? 'selected' : '' ?>>Ustadz</option>
            </select>
            Nama Ustadz (jika role Ustadz):
            <input type="text" name="ustadz_name" value="<?= htmlspecialchars($current_ustadz) ?>">
            <button type="submit">Simpan Role</button>
        </form>
    </div>
    
    <div class="card">
        <h2>Navigasi</h2>
        <ul>
            <li><a href="groups.php">Manajemen Kelompok</a></li>
            <li><a href="students.php">Kelola Daftar Pelajar</a></li>
            <li><a href="ustadz.php">Kelola Daftar Ustadz</a></li>
        </ul>
    </div>
    
    <div class="card">
        <h2>Status Integrasi Google</h2>
        <?php if (isset($_SESSION['access_token'])): ?>
            <p style="color: green;">✅ Terhubung dengan Google Account</p>
            <p>Anda sudah bisa melakukan sinkronisasi data ke Google Sheets dan Calendar.</p>
            <a href="sync.php" class="btn btn-success">Jalankan Sinkronisasi</a>
            <a href="logout.php" class="btn" style="background: #dc3545;">Logout Google</a>
        <?php else: ?>
            <p>Belum terhubung dengan Google. Silakan login untuk menghubungkan akun Google Anda.</p>
            <a href="auth.php" class="btn">Login dengan Google</a>
        <?php endif; ?>
    </div>
    
    <div class="card">
        <h2>Cara Penggunaan di CPanel</h2>
        <ol>
            <li>Import file <code>database.sql</code> ke dalam phpMyAdmin di CPanel.</li>
            <li>Ubah <code>$db_user</code>, <code>$db_pass</code>, dan <code>$db_name</code> di file <code>config.php</code>.</li>
            <li>Ubah <code>$google_client_id</code> dan <code>$google_client_secret</code> di <code>config.php</code> dengan kredensial dari Google Cloud Console.</li>
            <li>Pastikan <code>google_redirect_uri</code> diubah ke URL domain Anda.</li>
            <li>Jalankan perintah <code>composer install</code> di terminal CPanel untuk mengunduh library Google.</li>
        </ol>
    </div>
</body>
</html>
