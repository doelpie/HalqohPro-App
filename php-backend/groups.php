<?php
require_once 'config.php';

$current_role = $_SESSION['role'] ?? 'Super Administrator';
$current_ustadz = $_SESSION['ustadz_name'] ?? 'Ustadz Fulan';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add') {
        $ustadz_id = $_POST['ustadz_id'] ?? 0;
        $students = $_POST['students'] ?? [];
        
        if ($ustadz_id && !empty($students)) {
            $stmt = $conn->prepare("INSERT INTO halaqoh_groups (ustadz_id) VALUES (?)");
            $stmt->bind_param("i", $ustadz_id);
            $stmt->execute();
            $group_id = $conn->insert_id;
            
            $stmt_student = $conn->prepare("INSERT INTO group_students (group_id, student_id) VALUES (?, ?)");
            foreach($students as $student_id) {
                $stmt_student->bind_param("ii", $group_id, $student_id);
                $stmt_student->execute();
            }
        }
    } else if ($action === 'delete') {
        if ($current_role === 'Super Administrator') {
            $id = $_POST['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM halaqoh_groups WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
        }
    }
    
    header('Location: groups.php');
    exit;
}

// Fetch Ustadz
$ustadzResult = $conn->query("SELECT * FROM ustadz");
$ustadzList = $ustadzResult->fetch_all(MYSQLI_ASSOC);

// Fetch Students not already in a group, and created by this Ustadz if not Super Admin
if ($current_role === 'Super Administrator') {
    $studentResult = $conn->query("
        SELECT s.* FROM students s
        LEFT JOIN group_students gs ON s.id = gs.student_id
        WHERE gs.group_id IS NULL
    ");
} else {
    $stmt = $conn->prepare("
        SELECT s.* FROM students s
        LEFT JOIN group_students gs ON s.id = gs.student_id
        WHERE gs.group_id IS NULL AND s.created_by = ?
    ");
    $stmt->bind_param("s", $current_ustadz);
    $stmt->execute();
    $studentResult = $stmt->get_result();
}
$studentList = $studentResult->fetch_all(MYSQLI_ASSOC);

// Fetch Groups
$groupResult = $conn->query("
    SELECT g.id, u.name as ustadz_name 
    FROM halaqoh_groups g 
    JOIN ustadz u ON g.ustadz_id = u.id
");
$groups = [];
while($row = $groupResult->fetch_assoc()) {
    $g_id = $row['id'];
    
    // Check role filtering
    if ($current_role !== 'Super Administrator' && $row['ustadz_name'] !== $current_ustadz) {
        continue;
    }

    // fetch students for this group
    $gsResult = $conn->query("
        SELECT s.name 
        FROM group_students gs 
        JOIN students s ON gs.student_id = s.id 
        WHERE gs.group_id = $g_id
    ");
    $s_names = [];
    while($s_row = $gsResult->fetch_assoc()) {
        $s_names[] = $s_row['name'];
    }
    $row['students'] = $s_names;
    $groups[] = $row;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Manajemen Kelompok</title>
    <style>
        body { font-family: sans-serif; padding: 2rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .form-group { margin-bottom: 15px; }
        select, button { padding: 5px; }
        .student-checkbox { margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>Manajemen Kelompok (PHP)</h1>
    <a href="index.php">Kembali ke Beranda</a>
    <hr>
    
    <h3>Tambah Kelompok</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        
        <div class="form-group">
            <label>Pilih Ustadz:</label><br>
            <select name="ustadz_id" required <?= $current_role !== 'Super Administrator' ? 'disabled' : '' ?>>
                <option value="">-- Pilih Ustadz --</option>
                <?php foreach($ustadzList as $u): ?>
                    <option value="<?= $u['id'] ?>" <?= ($current_role !== 'Super Administrator' && $u['name'] === $current_ustadz) ? 'selected' : '' ?>><?= htmlspecialchars($u['name']) ?></option>
                <?php endforeach; ?>
            </select>
            <?php if ($current_role !== 'Super Administrator'): ?>
                <!-- We need to pass the selected Ustadz ID if disabled, since disabled inputs are not submitted -->
                <?php foreach($ustadzList as $u): ?>
                    <?php if ($u['name'] === $current_ustadz): ?>
                        <input type="hidden" name="ustadz_id" value="<?= $u['id'] ?>">
                    <?php endif; ?>
                <?php endforeach; ?>
            <?php endif; ?>
            <?php if ($current_role === 'Super Administrator'): ?>
                <a href="ustadz.php"><button type="button">Tambah Ustadz</button></a>
            <?php endif; ?>
        </div>
        
        <div class="form-group">
            <label>Pilih Pelajar:</label><br>
            <select id="student_select">
                <option value="">-- Pilih Pelajar --</option>
                <?php foreach($studentList as $s): ?>
                    <option value="<?= $s['id'] ?>" data-name="<?= htmlspecialchars($s['name']) ?>"><?= htmlspecialchars($s['name']) ?></option>
                <?php endforeach; ?>
            </select>
            <button type="button" onclick="addStudent()">Tambah ke List</button>
            <a href="students.php"><button type="button">Tambah Pelajar Baru</button></a>
        </div>
        
        <table id="selected_students_table" style="width: 50%; display: none; margin-bottom: 15px;">
            <thead>
                <tr><th>Nama Pelajar</th><th>Aksi</th></tr>
            </thead>
            <tbody id="selected_students_body">
            </tbody>
        </table>
        
        <button type="submit">Simpan Kelompok</button>
    </form>

    <script>
        function addStudent() {
            var select = document.getElementById('student_select');
            var option = select.options[select.selectedIndex];
            if (!option.value) return;

            var id = option.value;
            var name = option.getAttribute('data-name');

            // check if already added
            if (document.getElementById('input_s_' + id)) {
                alert('Pelajar sudah ada di list');
                return;
            }

            var tbody = document.getElementById('selected_students_body');
            var tr = document.createElement('tr');
            tr.id = 'tr_s_' + id;
            
            tr.innerHTML = `
                <td>${name}<input type="hidden" name="students[]" value="${id}" id="input_s_${id}"></td>
                <td><button type="button" onclick="removeStudent('${id}')">Hapus</button></td>
            `;
            tbody.appendChild(tr);
            
            document.getElementById('selected_students_table').style.display = 'table';
            select.value = '';
        }

        function removeStudent(id) {
            var tr = document.getElementById('tr_s_' + id);
            if (tr) tr.remove();
            
            var tbody = document.getElementById('selected_students_body');
            if (tbody.children.length === 0) {
                document.getElementById('selected_students_table').style.display = 'none';
            }
        }
    </script>

    <hr>
    <h3>Daftar Kelompok</h3>
    <table>
        <tr>
            <th>Ustadz</th>
            <th>Pelajar</th>
            <th>Aksi</th>
        </tr>
        <?php foreach($groups as $g): ?>
        <tr>
            <td><?= htmlspecialchars($g['ustadz_name']) ?></td>
            <td>
                <ul>
                    <?php foreach($g['students'] as $sn): ?>
                        <li><?= htmlspecialchars($sn) ?></li>
                    <?php endforeach; ?>
                </ul>
            </td>
            <td>
                <?php if ($current_role === 'Super Administrator'): ?>
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= $g['id'] ?>">
                    <button type="submit" onclick="return confirm('Yakin hapus kelompok ini?');">Hapus</button>
                </form>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>
