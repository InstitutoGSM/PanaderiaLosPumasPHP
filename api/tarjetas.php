<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── GET TARJETA ──
if ($action === 'get' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM tarjetas WHERE user_id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $tarjeta = $stmt->fetch();

    if (!$tarjeta) json_response(['error' => 'No hay tarjeta guardada'], 404);
    json_response($tarjeta);
}

// ── GUARDAR TARJETA ──
if ($action === 'guardar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body    = get_body();
    $masked  = $body['numero_enmascarado'] ?? '';
    $ultimos = $body['ultimos_4']          ?? '';
    $tipo    = $body['tipo']               ?? null;

    if (!$masked || !$ultimos) json_response(['error' => 'Faltan datos'], 400);

    $db = getDB();
    $db->prepare('
        INSERT INTO tarjetas (id, user_id, numero_enmascarado, ultimos_4, tipo)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          numero_enmascarado = VALUES(numero_enmascarado),
          ultimos_4          = VALUES(ultimos_4),
          tipo               = VALUES(tipo)
    ')->execute([
        bin2hex(random_bytes(16)),
        $_SESSION['user_id'],
        $masked,
        $ultimos,
        $tipo
    ]);

    json_response(['ok' => true]);
}

json_response(['error' => 'Acción no encontrada'], 404);
?>