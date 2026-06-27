<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'crear':
        $body        = getBody();
        $panaderia_id= $body['panaderia_id'] ?? '';
        $nombre      = trim($body['comprador_nombre'] ?? '');
        $email       = trim($body['comprador_email']  ?? '');
        $items       = $body['items'] ?? [];
        if (!$panaderia_id || !$nombre || !$email || empty($items)) jsonError('Faltan datos obligatorios');

        $ticket = 'TK-' . strtoupper(substr(md5(uniqid()), 0, 8));
        $total  = array_sum(array_map(fn($it) => (float)$it['precio_unit'] * (int)$it['cantidad'], $items));

        $db->beginTransaction();
        try {
            $pedido_id = generateUUID();
            $db->prepare(
                'INSERT INTO pedidos (id,ticket,panaderia_id,usuario_id,comprador_nombre,
                 comprador_email,comprador_tel,comprador_dir,comprador_cp,notas,medio_pago,total)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([
                $pedido_id, $ticket, $panaderia_id, $_SESSION['usuario_id'] ?? null,
                $nombre, $email,
                $body['comprador_tel'] ?? null, $body['comprador_dir'] ?? null,
                $body['comprador_cp']  ?? null, $body['notas'] ?? null,
                $body['medio_pago']    ?? 'efectivo', $total,
            ]);

            $ins = $db->prepare(
                'INSERT INTO pedido_items (pedido_id,producto_id,nombre,tipo_precio,precio_unit,cantidad,subtotal)
                 VALUES (?,?,?,?,?,?,?)'
            );
            foreach ($items as $it) {
                $qty = (int)$it['cantidad']; $pu = (float)$it['precio_unit'];
                $ins->execute([$pedido_id, $it['producto_id'] ?? null, $it['nombre'],
                               $it['tipo_precio'] ?? 'unidad', $pu, $qty, $pu * $qty]);
            }
            $db->commit();
            jsonOk(['pedido_id' => $pedido_id, 'ticket' => $ticket, 'total' => $total], 201);
        } catch (\Throwable $e) {
            $db->rollBack();
            jsonError('Error al guardar el pedido: ' . $e->getMessage(), 500);
        }

    case 'mis-pedidos':
        $sess = requireAuth();
        $stmt = $db->prepare(
            'SELECT p.*, pan.nombre AS panaderia_nombre FROM pedidos p
             JOIN panaderias pan ON pan.id = p.panaderia_id
             WHERE p.usuario_id = ? ORDER BY p.created_at DESC'
        );
        $stmt->execute([$sess['usuario_id']]);
        $pedidos = $stmt->fetchAll();
        foreach ($pedidos as &$ped) {
            $it = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
            $it->execute([$ped['id']]); $ped['items'] = $it->fetchAll();
        }
        jsonOk($pedidos);

    case 'vendedor':
        $sess   = requireTipo('vendedor', 'admin');
        $pan_id = $sess['panaderia_id'] ?? ($_GET['panaderia_id'] ?? '');
        if (!$pan_id) jsonError('Panadería no encontrada');

        $where = ['p.panaderia_id = ?']; $params = [$pan_id];
        if (!empty($_GET['estado'])) { $where[] = 'p.estado = ?'; $params[] = $_GET['estado']; }

        $stmt = $db->prepare(
            'SELECT p.* FROM pedidos p WHERE ' . implode(' AND ', $where) . ' ORDER BY p.created_at DESC'
        );
        $stmt->execute($params);
        $pedidos = $stmt->fetchAll();
        foreach ($pedidos as &$ped) {
            $it = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
            $it->execute([$ped['id']]); $ped['items'] = $it->fetchAll();
        }
        jsonOk($pedidos);

    case 'detalle':
        $ticket = $_GET['ticket'] ?? ''; $id = $_GET['id'] ?? '';
        if (!$ticket && !$id) jsonError('ticket o id requerido');
        if ($ticket) { $stmt = $db->prepare('SELECT * FROM pedidos WHERE ticket = ? LIMIT 1'); $stmt->execute([$ticket]); }
        else         { $stmt = $db->prepare('SELECT * FROM pedidos WHERE id = ? LIMIT 1');     $stmt->execute([$id]); }
        $ped = $stmt->fetch();
        if (!$ped) jsonError('Pedido no encontrado', 404);
        $it = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
        $it->execute([$ped['id']]); $ped['items'] = $it->fetchAll();
        jsonOk($ped);

    case 'cambiar-estado':
        $sess   = requireTipo('vendedor', 'admin');
        $body   = getBody();
        $id     = $body['id'] ?? ''; $estado = $body['estado'] ?? '';
        $validos= ['pendiente','confirmado','listo','entregado','cancelado'];
        if (!$id || !in_array($estado, $validos, true)) jsonError('Datos inválidos');

        $stmt = $db->prepare('SELECT panaderia_id FROM pedidos WHERE id = ? LIMIT 1');
        $stmt->execute([$id]); $ped = $stmt->fetch();
        if (!$ped) jsonError('Pedido no encontrado', 404);
        if ($sess['tipo'] === 'vendedor' && $ped['panaderia_id'] !== $sess['panaderia_id']) jsonError('Sin permiso', 403);

        $db->prepare('UPDATE pedidos SET estado = ? WHERE id = ?')->execute([$estado, $id]);
        jsonOk('Estado actualizado');

    default:
        jsonError('Acción no válida', 404);
}