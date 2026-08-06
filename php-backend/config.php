<?php
require_once __DIR__ . '/vendor/autoload.php';

session_start();

// Konfigurasi Database MySQL
$db_host = 'localhost';
$db_user = 'root'; // Sesuaikan di CPanel
$db_pass = ''; // Sesuaikan di CPanel
$db_name = 'halaqoh_db'; // Sesuaikan di CPanel

// Membuat koneksi ke MySQL
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Konfigurasi Google OAuth
// Masukkan Client ID dan Secret dari Google Cloud Console
$google_client_id = 'YOUR_GOOGLE_CLIENT_ID';
$google_client_secret = 'YOUR_GOOGLE_CLIENT_SECRET';
// URL Redirect, sesuaikan dengan URL aplikasi Anda di CPanel
$google_redirect_uri = 'https://domain-anda.com/auth.php';

$client = new Google_Client();
$client->setClientId($google_client_id);
$client->setClientSecret($google_client_secret);
$client->setRedirectUri($google_redirect_uri);

// Akses yang diperlukan (Drive, Sheets, Calendar)
$client->addScope(Google_Service_Drive::DRIVE_FILE);
$client->addScope(Google_Service_Sheets::SPREADSHEETS);
$client->addScope(Google_Service_Calendar::CALENDAR_EVENTS);
$client->addScope(Google_Service_Oauth2::USERINFO_EMAIL);
$client->setAccessType('offline');
$client->setPrompt('select_account consent');
// Migrate existing data if students or ustadz tables are empty
$ustadzCheck = $conn->query("SELECT COUNT(*) as cnt FROM ustadz");
$ustadzRow = $ustadzCheck->fetch_assoc();
if ($ustadzRow['cnt'] == 0) {
    // We assume group_name might represent Ustadz name, or we can just seed from halaqoh_data
    $result = $conn->query("SELECT DISTINCT group_name FROM halaqoh_data");
    while ($row = $result->fetch_assoc()) {
        $name = $row['group_name'];
        if ($name) {
            $stmt = $conn->prepare("INSERT INTO ustadz (name) VALUES (?)");
            $stmt->bind_param("s", $name);
            $stmt->execute();
        }
    }
}

$studentCheck = $conn->query("SELECT COUNT(*) as cnt FROM students");
$studentRow = $studentCheck->fetch_assoc();
if ($studentRow['cnt'] == 0) {
    $result = $conn->query("SELECT DISTINCT member_name FROM halaqoh_data");
    while ($row = $result->fetch_assoc()) {
        $name = $row['member_name'];
        if ($name) {
            $stmt = $conn->prepare("INSERT INTO students (name, created_by) VALUES (?, 'System')");
            $stmt->bind_param("s", $name);
            $stmt->execute();
        }
    }
}
?>
