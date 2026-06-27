<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

requireAuth();

$tipo  = $_GET['tipo'] ?? 'producto';
if (!in_array($tipo, ['producto','avatar','banner'], true)) jsonError('Tipo de upload inválido');
if (empty($_FILES['archivo'])) jsonError('No se recibió ningún archivo');

$file = $_FILES['archivo'];
if ($file['error'] !== UPLOAD_ERR_OK) jsonError('Error al subir: código ' . $file['error']);
if ($file['size'] > 5 * 1024 * 1024) jsonError('El archivo supera 5 MB');

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$mimeValidos = ['image/jpeg','image/png','image/webp','image/gif'];
if (!in_array($mime, $mimeValidos, true)) jsonError('Solo se permiten imágenes JPG, PNG, WEBP o GIF');

$ext     = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$mime] ?? 'jpg';
$carpeta = __DIR__ . '/../uploads/' . $tipo . '/';
if (!is_dir($carpeta)) mkdir($carpeta, 0755, true);

$nombre  = uniqid($tipo . '_', true) . '.' . $ext;
if (!move_uploaded_file($file['tmp_name'], $carpeta . $nombre)) jsonError('No se pudo guardar el archivo', 500);

jsonOk(['url' => 'uploads/' . $tipo . '/' . $nombre]);