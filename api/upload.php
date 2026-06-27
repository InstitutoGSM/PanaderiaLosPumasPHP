<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['error' => 'Método no permitido'], 405);
}

if (empty($_SESSION['user_id'])) {
    jsonOut(['error' => 'No autenticado'], 401);
}
// productos | avatares
$bucket = $_POST['bucket'] ?? 'productos';
$file   = $_FILES['file']  ?? null;

if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    jsonOut(['error' => 'Sin archivo o error en subida']);
}

// Validar tipo
$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo   = finfo_open(FILEINFO_MIME_TYPE);
$mime    = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowed, true)) {
    jsonOut(['error' => 'Tipo de archivo no permitido']);
}

// Validar tamaño (5MB máx)
if ($file['size'] > 5 * 1024 * 1024) {
    jsonOut(['error' => 'Archivo demasiado grande (máx 5MB)']);
}

// Definir carpeta destino
$bucketMap = [
    'productos' => 'assets/productos',
    'avatares'  => 'assets/avatares',
];
$dir = __DIR__ . '/../' . ($bucketMap[$bucket] ?? 'assets/otros');

if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$ext      = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
$filename = $_SESSION['user_id'] . '_' . time() . '.' . strtolower($ext);
$destPath = $dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    jsonOut(['error' => 'Error al mover el archivo']);
}

$publicUrl = ($bucketMap[$bucket] ?? 'assets/otros') . '/' . $filename;
jsonOut(['publicUrl' => $publicUrl, 'error' => null]);