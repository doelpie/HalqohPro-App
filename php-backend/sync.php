<?php
require_once 'config.php';

if (!isset($_SESSION['access_token'])) {
    header('Location: auth.php');
    exit;
}

$client->setAccessToken($_SESSION['access_token']);

echo "<h1>Proses Sinkronisasi</h1>";

// 1. Sinkronisasi ke Google Sheets
try {
    $sheetsService = new Google_Service_Sheets($client);
    $spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Ganti dengan ID Spreadsheet Anda
    
    // Ambil data dari tabel MySQL
    $result = $conn->query("SELECT date, group_name, member_name, attendance_status FROM halaqoh_data");
    $values = [
        ["Tanggal", "Kelompok", "Anggota", "Status Kehadiran"] // Header
    ];
    
    while ($row = $result->fetch_assoc()) {
        $values[] = [
            $row['date'],
            $row['group_name'],
            $row['member_name'],
            $row['attendance_status']
        ];
    }

    $body = new Google_Service_Sheets_ValueRange([
        'values' => $values
    ]);
    
    $params = ['valueInputOption' => 'RAW'];
    // Update data di sheet 1
    $sheetsService->spreadsheets_values->update($spreadsheetId, 'Sheet1!A1', $body, $params);
    echo "<p>✅ Data berhasil disinkronisasi ke Google Sheets!</p>";
} catch (Exception $e) {
    echo "<p>❌ Gagal sinkronisasi Sheets: " . $e->getMessage() . "</p>";
}

// 2. Sinkronisasi ke Google Calendar
try {
    $calendarService = new Google_Service_Calendar($client);
    
    // Contoh menambahkan event jadwal halaqoh
    $event = new Google_Service_Calendar_Event(array(
      'summary' => 'Jadwal Halaqoh',
      'description' => 'Pertemuan rutin kelompok Halaqoh.',
      'start' => array(
        'dateTime' => '2026-08-10T16:00:00+07:00',
        'timeZone' => 'Asia/Jakarta',
      ),
      'end' => array(
        'dateTime' => '2026-08-10T17:30:00+07:00',
        'timeZone' => 'Asia/Jakarta',
      ),
    ));

    $calendarId = 'primary';
    $event = $calendarService->events->insert($calendarId, $event);
    echo "<p>✅ Event berhasil ditambahkan ke Google Calendar: <a href='" . $event->htmlLink . "' target='_blank'>Lihat Kalender</a></p>";
} catch (Exception $e) {
    echo "<p>❌ Gagal sinkronisasi Calendar: " . $e->getMessage() . "</p>";
}

echo "<br><a href='index.php'>Kembali ke Beranda</a>";
?>
