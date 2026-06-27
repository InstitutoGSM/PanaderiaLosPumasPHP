<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'listar':
        $prod_id = $_GET['producto_id'] ?? ''; if (!$prod_id) jsonError('producto_id requerido');
        $stmt = $db->prepare(
            'SELECT c.*, u.nombre AS usuario_nombre, u.avatar_url AS usuario_avatar
             FROM calificaciones c JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.producto_id = ? ORDER BY c.created_at DESC'
        );
        $stmt->execute([$prod_id]); jsonOk($stmt->fetchAll());

    case 'crear':
        $sess      = requireAuth(); $body = getBody();
        $prod_id   = $body['producto_id'] ?? '';
        $estrellas = (int)($body['estrellas'] ?? 0);
        if (!$prod_id) jsonError('producto_id requerido');
        if ($estrellas < 1 || $estrellas > 5) jsonError('Estrellas deben ser entre 1 y 5');

        $check = $db->prepare('SELECT id FROM calificaciones WHERE usuario_id=? AND producto_id=? LIMIT 1');
        $check->execute([$sess['usuario_id'], $prod_id]);
        if ($check->fetch()) jsonError('Ya calificaste este producto');

        $id = generateUUID();
        $db->prepare(
            'INSERT INTO calificaciones (id,producto_id,usuario_id,pedido_id,estrellas,comentario)
             VALUES (?,?,?,?,?,?)'
        )->execute([$id, $prod_id, $sess['usuario_id'], $body['pedido_id'] ?? null,
                    $estrellas, trim($body['comentario'] ?? '') ?: null]);

        $avg = $db->prepare('SELECT ROUND(AVG(estrellas),1) AS r, COUNT(*) AS t FROM calificaciones WHERE producto_id=?');
        $avg->execute([$prod_id]); $s = $avg->fetch();
        jsonOk(['id' => $id, 'rating' => $s['r'], 'total' => $s['t']], 201);

    case 'mi-calificacion':
        $sess    = requireAuth(); $prod_id = $_GET['producto_id'] ?? '';
        if (!$prod_id) jsonError('producto_id requerido');
        $stmt = $db->prepare('SELECT * FROM calificaciones WHERE usuario_id=? AND producto_id=? LIMIT 1');
        $stmt->execute([$sess['usuario_id'], $prod_id]); jsonOk($stmt->fetch() ?: null);

    case 'eliminar':
        $sess = requireTipo('admin'); $body = getBody(); $id = $body['id'] ?? '';
        if (!$id) jsonError('ID requerido');
        $db->prepare('DELETE FROM calificaciones WHERE id=?')->execute([$id]);
        jsonOk('Calificación eliminada');

    default:
        jsonError('Acción no válida', 404);
}