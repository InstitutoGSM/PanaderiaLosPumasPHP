<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── OBT CALIFICACIONES DE UN PRODUCTO ──
if ($action === 'get' && $method === 'GET') {
    $producto_id = $_GET['producto_id'] ?? '';
    if (!$producto_id) json_response(['error' => 'Falta producto_id'], 400);

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM calificaciones WHERE producto_id = ?');
    $stmt->execute([$producto_id]);
    $cals = $stmt->fetchAll();

    $total    = count($cals);
    $promedio = $total > 0
        ? array_sum(array_column($cals, 'estrellas')) / $total
        : 0;

    $mi_cal = 0;
    if (isset($_SESSION['user_id'])) {
        $stmt2 = $db->prepare('
            SELECT estrellas FROM calificaciones
            WHERE producto_id = ? AND comprador_id = ?
        ');
        $stmt2->execute([$producto_id, $_SESSION['user_id']]);
        $mia    = $stmt2->fetch();
        $mi_cal = $mia['estrellas'] ?? 0;
    }

    json_response([
        'total'    => $total,
        'promedio' => $promedio,
        'mi_cal'   => $mi_cal,
    ]);
}

// ── CALIFICAR ──
if ($action === 'calificar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body        = get_body();
    $producto_id = $body['producto_id'] ?? '';
    $estrellas   = intval($body['estrellas'] ?? 0);

    if (!$producto_id || $estrellas < 1 || $estrellas > 5) {
        json_response(['error' => 'Datos inválidos'], 400);
    }

    $db = getDB();
    $db->prepare('
        INSERT INTO calificaciones (id, producto_id, comprador_id, estrellas)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE estrellas = ?
    ')->execute([
        bin2hex(random_bytes(16)),
        $producto_id,
        $_SESSION['user_id'],
        $estrellas,
        $estrellas,
    ]);

    json_response(['ok' => true]);
}

json_response(['error' => 'Acción no encontrada'], 404);
?>