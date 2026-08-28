<?php
if (session_status() === PHP_SESSION_NONE) {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
}
require_once 'config.php';

$current_role = $_SESSION['role'] ?? 'Super Administrator';
$current_ustadz = $_SESSION['ustadz_name'] ?? 'Ustadz Fulan';

$current_page = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aplikasi Halaqoh</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8fafc; }
    </style>
</head>
<body class="flex h-screen overflow-hidden text-slate-800">
    <!-- Sidebar -->
    <div class="w-64 bg-slate-900 text-slate-300 flex flex-col h-full hidden md:flex shrink-0">
        <div class="p-6">
            <h1 class="text-xl font-bold text-white flex items-center gap-2">
                <i class="fas fa-book-open text-emerald-500"></i>
                Halaqoh App
            </h1>
        </div>
        <nav class="flex-1 px-4 space-y-2 overflow-y-auto">
            <a href="index.php" class="<?= $current_page == 'index.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-home w-5"></i> Dashboard
            </a>
            <a href="progress.php" class="<?= $current_page == 'progress.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-chart-line w-5"></i> Perkembangan
            </a>
            <a href="calendar.php" class="<?= $current_page == 'calendar.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-calendar w-5"></i> Jadwal & Kalender
            </a>
            <a href="groups.php" class="<?= $current_page == 'groups.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-users w-5"></i> Kelompok Halaqoh
            </a>
            <a href="materials.php" class="<?= $current_page == 'materials.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-book w-5"></i> Materi Halaqoh
            </a>
            <a href="students.php" class="<?= $current_page == 'students.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-user-graduate w-5"></i> Daftar Pelajar
            </a>
            <a href="ustadz.php" class="<?= $current_page == 'ustadz.php' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white' ?> flex items-center gap-3 px-4 py-3 rounded-xl transition-colors">
                <i class="fas fa-chalkboard-teacher w-5"></i> Daftar Ustadz
            </a>
        </nav>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-full overflow-hidden">
        <!-- Topbar -->
        <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
            <h2 class="text-xl font-bold text-slate-800 capitalize">
                <?= str_replace('.php', '', $current_page) ?>
            </h2>
            <div class="flex items-center gap-4">
                <form method="POST" action="index.php" class="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input type="hidden" name="set_role" value="1">
                    <select name="role" class="bg-transparent border-none outline-none text-slate-700 font-medium cursor-pointer">
                        <option value="Super Administrator" <?= $current_role === 'Super Administrator' ? 'selected' : '' ?>>Super Admin</option>
                        <option value="Ustadz" <?= $current_role === 'Ustadz' ? 'selected' : '' ?>>Ustadz</option>
                    </select>
                    <div class="w-px h-4 bg-slate-300"></div>
                    <input type="text" name="ustadz_name" value="<?= htmlspecialchars($current_ustadz) ?>" class="bg-transparent border-none outline-none w-32 text-slate-700 placeholder-slate-400 font-medium" placeholder="Nama Ustadz">
                    <button type="submit" class="text-emerald-600 hover:text-emerald-700 px-2"><i class="fas fa-save"></i></button>
                </form>
            </div>
        </header>

        <!-- Main Scrollable Area -->
        <main class="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div class="max-w-6xl mx-auto space-y-6">
