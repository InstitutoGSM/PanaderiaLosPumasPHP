<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── AGREGAR FOTO ──
if ($action === 'agregar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body        = get_body();
    $producto_id = $body['producto_id'] ?? '';
    $url         = $body['url']         ?? '';
    $orden       = $body['orden']       ?? 0;

    if (!$producto_id || !$url) json_response(['error' => 'Faltan datos'], 400);

    $id = bin2hex(random_bytes(16));
    $db = getDB();
    $db->prepare('INSERT INTO producto_fotos (id, producto_id, url, orden) VALUES (?,?,?,?)')
       ->execute([$id, $producto_id, $url, $orden]);

    json_response(['ok' => true, 'id' => $id]);
}

// ── OBT FOTOS DE UN PRODUCTO ──
if ($action === 'get' && $method === 'GET') {
    $producto_id = $_GET['producto_id'] ?? '';
    if (!$producto_id) json_response(['error' => 'Falta producto_id'], 400);

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM producto_fotos WHERE producto_id = ? ORDER BY orden');
    $stmt->execute([$producto_id]);
    json_response($stmt->fetchAll());
}

// ── ELIMINAR FOTO ──
if ($action === 'eliminar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $id   = $body['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db = getDB();
    $db->prepare('DELETE FROM producto_fotos WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Acción no encontrada'], 404);
?>