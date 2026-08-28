<?php
if (session_status() === PHP_SESSION_NONE) { if (session_status() === PHP_SESSION_NONE) { session_start(); } }
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['set_role'])) {
    $_SESSION['role'] = $_POST['role'];
    $_SESSION['ustadz_name'] = $_POST['ustadz_name'];
    $referer = $_SERVER['HTTP_REFERER'] ?? 'index.php';
    header("Location: " . $referer);
    exit;
}

require_once 'header.php';
?>

<!-- Dashboard Content -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <i class="fas fa-users text-xl"></i>
        </div>
        <h3 class="text-slate-500 font-medium">Total Kelompok</h3>
        <p class="text-3xl font-bold text-slate-800">
            <?php 
                $res = $conn->query("SELECT COUNT(*) as c FROM halaqoh_groups");
                echo $res ? $res->fetch_assoc()['c'] : '0';
            ?>
        </p>
    </div>
    
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <i class="fas fa-user-graduate text-xl"></i>
        </div>
        <h3 class="text-slate-500 font-medium">Total Pelajar</h3>
        <p class="text-3xl font-bold text-slate-800">
            <?php 
                $res = $conn->query("SELECT COUNT(*) as c FROM students");
                echo $res ? $res->fetch_assoc()['c'] : '0';
            ?>
        </p>
    </div>
    
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
            <i class="fas fa-chalkboard-teacher text-xl"></i>
        </div>
        <h3 class="text-slate-500 font-medium">Total Ustadz</h3>
        <p class="text-3xl font-bold text-slate-800">
            <?php 
                $res = $conn->query("SELECT COUNT(*) as c FROM ustadz");
                echo $res ? $res->fetch_assoc()['c'] : '0';
            ?>
        </p>
    </div>
</div>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
    <h2 class="text-lg font-bold mb-4">Status Integrasi Google</h2>
    <?php if (isset($_SESSION['access_token'])): ?>
        <div class="p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i class="fas fa-check-circle text-xl"></i>
                <div>
                    <p class="font-bold">Terhubung dengan Google Account</p>
                    <p class="text-sm">Anda sudah bisa melakukan sinkronisasi data ke Google Sheets dan Calendar.</p>
                </div>
            </div>
            <div class="flex gap-2">
                <a href="sync.php" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">Jalankan Sinkronisasi</a>
                <a href="logout.php" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-medium">Logout</a>
            </div>
        </div>
    <?php else: ?>
        <div class="p-4 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-between border border-slate-200">
            <div class="flex items-center gap-3">
                <i class="fas fa-exclamation-circle text-xl text-slate-400"></i>
                <div>
                    <p class="font-bold">Belum Terhubung</p>
                    <p class="text-sm">Silakan login untuk menghubungkan akun Google Anda.</p>
                </div>
            </div>
            <a href="auth.php" class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium shadow-sm flex items-center gap-2">
                <i class="fab fa-google text-red-500"></i> Login Google
            </a>
        </div>
    <?php endif; ?>
</div>

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <h2 class="text-lg font-bold mb-4">Cara Penggunaan di CPanel</h2>
    <ol class="list-decimal list-inside space-y-2 text-slate-600">
        <li>Import file <code class="bg-slate-100 px-1 rounded text-pink-600">database.sql</code> ke dalam phpMyAdmin di CPanel.</li>
        <li>Ubah <code class="bg-slate-100 px-1 rounded">config.php</code> dengan detail kredensial database dan Google OAuth Anda.</li>
        <li>Jalankan aplikasi ini. Template ini sudah mensimulasikan fungsionalitas React SPA di versi PHP.</li>
    </ol>
</div>

<?php require_once 'footer.php'; ?>
