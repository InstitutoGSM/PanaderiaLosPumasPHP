<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'listar':
        $stmt = $db->query(
            'SELECT pan.*, u.email, COUNT(DISTINCT p.id) AS total_productos,
                    ROUND(COALESCE(AVG(cal.estrellas),0),1) AS rating
             FROM panaderias pan JOIN usuarios u ON u.id = pan.usuario_id
             LEFT JOIN productos p   ON p.panaderia_id = pan.id AND p.activo = 1
             LEFT JOIN calificaciones cal ON cal.producto_id = p.id
             WHERE pan.activo = 1 GROUP BY pan.id ORDER BY pan.nombre ASC'
        );
        jsonOk($stmt->fetchAll());

    case 'detalle':
        $id = $_GET['id'] ?? ''; if (!$id) jsonError('ID requerido');
        $stmt = $db->prepare(
            'SELECT pan.*, u.email FROM panaderias pan JOIN usuarios u ON u.id = pan.usuario_id WHERE pan.id = ? LIMIT 1'
        );
        $stmt->execute([$id]); $pan = $stmt->fetch();
        if (!$pan) jsonError('Panadería no encontrada', 404);
        jsonOk($pan);

    case 'mi-perfil':
        $sess   = requireTipo('vendedor');
        $pan_id = $sess['panaderia_id'] ?? ''; if (!$pan_id) jsonError('Sin panadería', 404);
        $stmt   = $db->prepare('SELECT * FROM panaderias WHERE id = ? LIMIT 1');
        $stmt->execute([$pan_id]); $pan = $stmt->fetch();
        if (!$pan) jsonError('Panadería no encontrada', 404);
        jsonOk($pan);

    case 'editar':
        $sess   = requireTipo('vendedor', 'admin');
        $body   = getBody();
        $pan_id = $sess['panaderia_id'] ?? ($body['id'] ?? '');
        if (!$pan_id) jsonError('ID de panadería requerido');

        $db->prepare(
            'UPDATE panaderias SET nombre=?,descripcion=?,instagram=?,telefono=?,direccion=?,
             cbu_alias=?,titular_cbu=?,acepta_efectivo=?,acepta_transferencia=?,acepta_tarjeta=?,
             avatar_url=?,banner_url=? WHERE id=?'
        )->execute([
            trim($body['nombre'] ?? ''), $body['descripcion'] ?? null,
            $body['instagram'] ?? null,  $body['telefono']    ?? null,
            $body['direccion'] ?? null,  $body['cbu_alias']   ?? null,
            $body['titular_cbu'] ?? null,
            (int)(bool)($body['acepta_efectivo']      ?? true),
            (int)(bool)($body['acepta_transferencia'] ?? false),
            (int)(bool)($body['acepta_tarjeta']       ?? false),
            $body['avatar_url'] ?? null, $body['banner_url'] ?? null, $pan_id,
        ]);
        jsonOk('Perfil actualizado');

    case 'stats':
        $sess   = requireTipo('vendedor');
        $pan_id = $sess['panaderia_id'] ?? ''; if (!$pan_id) jsonError('Sin panadería');

        $r1 = $db->prepare('SELECT COUNT(*) AS t FROM productos WHERE panaderia_id=? AND activo=1'); $r1->execute([$pan_id]);
        $r2 = $db->prepare('SELECT COUNT(*) AS tp, COALESCE(SUM(total),0) AS tv FROM pedidos WHERE panaderia_id=? AND estado!="cancelado"'); $r2->execute([$pan_id]); $v = $r2->fetch();
        $r3 = $db->prepare('SELECT COUNT(*) AS t FROM pedidos WHERE panaderia_id=? AND estado="pendiente"'); $r3->execute([$pan_id]);
        $r4 = $db->prepare('SELECT ROUND(COALESCE(AVG(c.estrellas),0),1) AS r FROM calificaciones c JOIN productos p ON p.id=c.producto_id WHERE p.panaderia_id=?'); $r4->execute([$pan_id]);

        jsonOk([
            'productos'          => $r1->fetch()['t'],
            'total_pedidos'      => $v['tp'],
            'total_ventas'       => $v['tv'],
            'pedidos_pendientes' => $r3->fetch()['t'],
            'rating'             => $r4->fetch()['r'],
        ]);

    default:
        jsonError('Acción no válida', 404);
}