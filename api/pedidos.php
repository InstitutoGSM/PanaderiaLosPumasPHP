<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── CREAR PEDIDO ──
if ($action === 'crear' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body      = get_body();
    $id        = bin2hex(random_bytes(16));
    $ticket_id = 'TK-' . strtoupper(substr($id, -8)) . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 4));
    $db        = getDB();

    $db->prepare('
        INSERT INTO pedidos
        (id, comprador_id, vendedor_id, items, total, estado,
         medio_pago, ticket_id, codigo_postal, direccion, notas,
         nombre_comprador, email_comprador)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ')->execute([
        $id,
        $_SESSION['user_id'],
        $body['vendedor_id']      ?? null,
        json_encode($body['items'] ?? []),
        $body['total']            ?? 0,
        'pendiente',
        $body['medio_pago']       ?? null,
        $ticket_id,
        $body['codigo_postal']    ?? null,
        $body['direccion']        ?? null,
        $body['notas']            ?? null,
        $body['nombre_comprador'] ?? null,
        $body['email_comprador']  ?? null,
    ]);

    $stmt = $db->prepare('SELECT * FROM pedidos WHERE id = ?');
    $stmt->execute([$id]);
    $result         = $stmt->fetch();
    $result['items'] = json_decode($result['items'], true);
    json_response($result);
}

// ── PEDIDOS DEL COMPRADOR ──
if ($action === 'mis_pedidos' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT * FROM pedidos WHERE comprador_id = ? ORDER BY created_at DESC
    ');
    $stmt->execute([$_SESSION['user_id']]);
    $pedidos = $stmt->fetchAll();
    foreach ($pedidos as &$p) $p['items'] = json_decode($p['items'], true);
    json_response($pedidos);
}

// ── PEDIDOS DEL VENDEDOR ──
if ($action === 'del_vendedor' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT * FROM pedidos WHERE vendedor_id = ? ORDER BY created_at DESC
    ');
    $stmt->execute([$_SESSION['user_id']]);
    $pedidos = $stmt->fetchAll();
    foreach ($pedidos as &$p) $p['items'] = json_decode($p['items'], true);
    json_response($pedidos);
}

// ── CAMBIAR ESTADO ──
if ($action === 'estado' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body   = get_body();
    $id     = $body['id']     ?? '';
    $estado = $body['estado'] ?? '';
    if (!$id || !$estado) json_response(['error' => 'Faltan campos'], 400);

    $db = getDB();
    $db->prepare('UPDATE pedidos SET estado = ? WHERE id = ? AND vendedor_id = ?')
       ->execute([$estado, $id, $_SESSION['user_id']]);
    json_response(['ok' => true]);
}

// ── CONTAR ENTREGADOS (para stats del home) ──
if ($action === 'contar_entregados' && $method === 'GET') {
    $db   = getDB();
    $stmt = $db->query('SELECT COUNT(*) AS total FROM pedidos WHERE estado = "entregado"');
    $row  = $stmt->fetch();
    json_response(['count' => (int)$row['total']]);
}

json_response(['error' => 'Acción no encontrada'], 404);
?>