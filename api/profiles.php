<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── OBT PERFIL ──
if ($action === 'get' && $method === 'GET') {
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM profiles WHERE id = ?');
    $stmt->execute([$id]);
    $perfil = $stmt->fetch();

    if (!$perfil) json_response(['error' => 'No encontrado'], 404);
    json_response($perfil);
}

// ── ACTUALIZAR PERFIL ──
if ($action === 'actualizar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $db   = getDB();

    $db->prepare('
        UPDATE profiles SET
        nombre = ?, nombre_panaderia = ?, descripcion = ?,
        instagram = ?, telefono = ?, email_contacto = ?, banner_anuncio = ?,
        cbu = ?, alias_cbu = ?, titular_cuenta = ?, medios_pago = ?,
        avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
    ')->execute([
        $body['nombre']           ?? null,
        $body['nombre_panaderia'] ?? null,
        $body['descripcion']      ?? null,
        $body['instagram']        ?? null,
        $body['telefono']         ?? null,
        $body['email_contacto']   ?? null,
        $body['banner_anuncio']   ?? null,
        $body['cbu']              ?? null,
        $body['alias_cbu']        ?? null,
        $body['titular_cuenta']   ?? null,
        isset($body['medios_pago']) ? json_encode($body['medios_pago']) : null,
        $body['avatar_url']       ?? null,
        $_SESSION['user_id'],
    ]);

    json_response(['ok' => true]);
}

// ── ACTUALIZAR AVATAR ──
if ($action === 'avatar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    if (!isset($_FILES['avatar'])) json_response(['error' => 'Falta archivo'], 400);

    $file    = $_FILES['avatar'];
    $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp'];

    if (!in_array($ext, $allowed)) json_response(['error' => 'Formato no permitido'], 400);
    if ($file['size'] > 2 * 1024 * 1024) json_response(['error' => 'Máx 2MB'], 400);

    $carpeta = '../assets/avatares/';
    if (!is_dir($carpeta)) mkdir($carpeta, 0777, true);

    $nombre = $_SESSION['user_id'] . '.' . $ext;
    move_uploaded_file($file['tmp_name'], $carpeta . $nombre);

    $url = 'assets/avatares/' . $nombre;

    $db = getDB();
    $db->prepare('UPDATE profiles SET avatar_url = ? WHERE id = ?')
        ->execute([$url, $_SESSION['user_id']]);

    json_response(['url' => $url]);
}

json_response(['error' => 'Acción no encontrada'], 404);
