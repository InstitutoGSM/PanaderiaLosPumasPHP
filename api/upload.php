<?php
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') json_response(['ok' => true]);

if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

$bucket  = $_GET['bucket'] ?? 'productos';
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

if (!isset($_FILES['file'])) json_response(['error' => 'Falta archivo'], 400);

$file = $_FILES['file'];
$ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($ext, $allowed)) json_response(['error' => 'Formato no permitido'], 400);
if ($file['size'] > 5 * 1024 * 1024) json_response(['error' => 'Máx 5MB'], 400);

$carpeta = '../assets/' . $bucket . '/';
if (!is_dir($carpeta)) mkdir($carpeta, 0777, true);

$nombre   = $_SESSION['user_id'] . '_' . time() . '.' . $ext;
$destino  = $carpeta . $nombre;

if (!move_uploaded_file($file['tmp_name'], $destino)) {
    json_response(['error' => 'Error al subir archivo'], 500);
}

$url = 'assets/' . $bucket . '/' . $nombre;
json_response(['url' => $url]);
?>