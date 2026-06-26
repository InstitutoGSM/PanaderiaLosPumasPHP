<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// Helper: verificar que el usuario logueado sea admin
function checkAdmin() {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);
    $db   = getDB();
    $stmt = $db->prepare('SELECT tipo FROM profiles WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $p = $stmt->fetch();
    if (!$p || $p['tipo'] !== 'admin') json_response(['error' => 'Acceso denegado'], 403);
}

// ── LISTAR VENDEDORES ──
if ($action === 'vendedores' && $method === 'GET') {
    checkAdmin();
    $db   = getDB();
    $stmt = $db->query('
        SELECT p.*, u.email
        FROM profiles p
        LEFT JOIN usuarios u ON u.id = p.id
        WHERE p.tipo = "vendedor"
        ORDER BY p.created_at DESC
    ');
    json_response($stmt->fetchAll());
}

// ── CAMBIAR ESTADO DE VERIFICACIÓN ──
if ($action === 'cambiar_estado' && $method === 'POST') {
    checkAdmin();
    $body   = get_body();
    $vid    = $body['vendedor_id'] ?? '';
    $estado = $body['estado']      ?? '';

    if (!$vid || !in_array($estado, ['pendiente', 'aprobado', 'rechazado'])) {
        json_response(['error' => 'Datos inválidos'], 400);
    }

    $db = getDB();
    $db->prepare('UPDATE profiles SET estado_verificacion = ? WHERE id = ? AND tipo = "vendedor"')
       ->execute([$estado, $vid]);
    json_response(['ok' => true]);
}

// ── STATS ──
if ($action === 'stats' && $method === 'GET') {
    checkAdmin();
    $db = getDB();
    $row = $db->query('
        SELECT
          SUM(estado_verificacion = "pendiente")  AS pendientes,
          SUM(estado_verificacion = "aprobado")   AS aprobados,
          SUM(estado_verificacion = "rechazado")  AS rechazados,
          COUNT(*)                                AS total
        FROM profiles WHERE tipo = "vendedor"
    ')->fetch();
    json_response($row);
}

json_response(['error' => 'Acción no encontrada'], 404);
?>