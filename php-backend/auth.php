<?php
require_once 'config.php';

if (isset($_GET['code'])) {
    $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
    
    if (!isset($token['error'])) {
        $client->setAccessToken($token['access_token']);
        $_SESSION['access_token'] = $token['access_token'];
        
        // Dapatkan profil user untuk menyimpan ke database yang benar
        $oauth2 = new Google_Service_Oauth2($client);
        $userInfo = $oauth2->userinfo->get();
        $email = $userInfo->email;
        
        $access_token = $token['access_token'];
        $refresh_token = $token['refresh_token'] ?? '';

        // Simpan atau update token di MySQL
        $stmt = $conn->prepare("INSERT INTO users (email, google_access_token, google_refresh_token) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE google_access_token=?, google_refresh_token=?");
        $stmt->bind_param("sssss", $email, $access_token, $refresh_token, $access_token, $refresh_token);
        $stmt->execute();

        // Redirect kembali ke halaman utama
        header('Location: index.php');
        exit;
    } else {
        die("Terjadi kesalahan saat otentikasi Google: " . $token['error_description']);
    }
}

// Jika belum login, arahkan ke URL Login Google
$authUrl = $client->createAuthUrl();
header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
exit;
?>
