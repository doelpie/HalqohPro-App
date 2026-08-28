<?php
require_once 'header.php';

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

<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col">
    <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Tambah Kelompok</h3>
    <form method="POST">
        <input type="hidden" name="action" value="add">
        
        <div class="grid gap-6 md:grid-cols-2">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Pilih Ustadz</label>
                <div class="flex gap-2">
                    <select name="ustadz_id" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none" <?= $current_role !== 'Super Administrator' ? 'disabled' : '' ?>>
                        <option value="">-- Pilih Ustadz --</option>
                        <?php foreach($ustadzList as $u): ?>
                            <option value="<?= $u['id'] ?>" <?= ($current_role !== 'Super Administrator' && $u['name'] === $current_ustadz) ? 'selected' : '' ?>><?= htmlspecialchars($u['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                    <?php if ($current_role !== 'Super Administrator'): ?>
                        <?php foreach($ustadzList as $u): ?>
                            <?php if ($u['name'] === $current_ustadz): ?>
                                <input type="hidden" name="ustadz_id" value="<?= $u['id'] ?>">
                            <?php endif; ?>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <?php if ($current_role === 'Super Administrator'): ?>
                        <a href="ustadz.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 flex items-center justify-center">
                            <i class="fas fa-plus"></i>
                        </a>
                    <?php endif; ?>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Pilih Pelajar</label>
                <div class="flex gap-2 mb-3">
                    <select id="student_select" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none" onchange="addStudent()">
                        <option value="">-- Pilih Pelajar --</option>
                        <?php foreach($studentList as $s): ?>
                            <option value="<?= $s['id'] ?>" data-name="<?= htmlspecialchars($s['name']) ?>"><?= htmlspecialchars($s['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                    <a href="students.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 flex items-center justify-center">
                        <i class="fas fa-plus"></i>
                    </a>
                </div>
                
                <div id="selected_students_table" class="border border-slate-200 rounded-lg overflow-hidden hidden">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-3 py-2">Nama Pelajar</th>
                                <th class="px-3 py-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="selected_students_body" class="divide-y divide-slate-100 bg-white">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <button type="submit" class="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm">
            Simpan Kelompok
        </button>
    </form>
</div>

<script>
    function addStudent() {
        var select = document.getElementById('student_select');
        var option = select.options[select.selectedIndex];
        if (!option.value) return;

        var id = option.value;
        var name = option.getAttribute('data-name');

        if (document.getElementById('input_s_' + id)) {
            alert('Pelajar sudah ada di list');
            return;
        }

        var tbody = document.getElementById('selected_students_body');
        var tr = document.createElement('tr');
        tr.id = 'tr_s_' + id;
        
        tr.innerHTML = `
            <td class="px-3 py-2">${name}<input type="hidden" name="students[]" value="${id}" id="input_s_${id}"></td>
            <td class="px-3 py-2 text-right">
                <button type="button" onclick="removeStudent('${id}')" class="text-red-500 hover:bg-red-50 p-1 rounded">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        
        document.getElementById('selected_students_table').style.display = 'block';
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

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <?php foreach($groups as $idx => $g): ?>
    <?php
        $bgColors = ['bg-emerald-50', 'bg-blue-50', 'bg-amber-50', 'bg-indigo-50'];
        $textColors = ['text-emerald-700', 'text-blue-700', 'text-amber-700', 'text-indigo-700'];
        $colorIdx = $idx % 4;
    ?>
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div class="flex items-start justify-between mb-4">
            <div class="w-10 h-10 <?= $bgColors[$colorIdx] ?> <?= $textColors[$colorIdx] ?> rounded-lg flex items-center justify-center">
                <i class="fas fa-users"></i>
            </div>
            <?php if ($current_role === 'Super Administrator'): ?>
            <form method="POST">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="id" value="<?= $g['id'] ?>">
                <button type="submit" onclick="return confirm('Yakin hapus kelompok ini?');" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg text-sm font-medium">Hapus</button>
            </form>
            <?php endif; ?>
        </div>
        
        <h3 class="font-bold text-lg mb-2 text-slate-800">Kelompok <?= htmlspecialchars($g['ustadz_name']) ?></h3>
        <div class="flex flex-wrap gap-2 mb-4">
            <?php foreach($g['students'] as $sn): ?>
                <span class="text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-medium">
                    <?= htmlspecialchars($sn) ?>
                </span>
            <?php endforeach; ?>
        </div>
        
        <div class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span><?= count($g['students']) ?> Anggota</span>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<?php require_once 'footer.php'; ?>
