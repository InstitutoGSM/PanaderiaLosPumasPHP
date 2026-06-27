<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$sess   = requireTipo('admin');
$db     = getDB();

switch ($action) {

    case 'stats':
        jsonOk([
            'usuarios'     => $db->query('SELECT COUNT(*) AS t FROM usuarios WHERE activo=1')->fetch()['t'],
            'vendedores'   => $db->query('SELECT COUNT(*) AS t FROM usuarios WHERE tipo="vendedor" AND activo=1')->fetch()['t'],
            'compradores'  => $db->query('SELECT COUNT(*) AS t FROM usuarios WHERE tipo="comprador" AND activo=1')->fetch()['t'],
            'panaderias'   => $db->query('SELECT COUNT(*) AS t FROM panaderias WHERE activo=1')->fetch()['t'],
            'productos'    => $db->query('SELECT COUNT(*) AS t FROM productos WHERE activo=1')->fetch()['t'],
            'pedidos'      => $db->query('SELECT COUNT(*) AS t FROM pedidos')->fetch()['t'],
            'pendientes'   => $db->query('SELECT COUNT(*) AS t FROM pedidos WHERE estado="pendiente"')->fetch()['t'],
            'ventas_total' => $db->query('SELECT COALESCE(SUM(total),0) AS t FROM pedidos WHERE estado!="cancelado"')->fetch()['t'],
        ]);

    case 'usuarios':
        $stmt = $db->query(
            'SELECT u.id,u.email,u.nombre,u.tipo,u.activo,u.created_at,
                    pan.id AS panaderia_id, pan.nombre AS panaderia_nombre
             FROM usuarios u LEFT JOIN panaderias pan ON pan.usuario_id=u.id
             ORDER BY u.created_at DESC'
        );
        jsonOk($stmt->fetchAll());

    case 'toggle-usuario':
        $body = getBody(); $id = $body['id'] ?? ''; if (!$id) jsonError('ID requerido');
        if ($id === $sess['usuario_id']) jsonError('No podés desactivar tu propia cuenta');
        $db->prepare('UPDATE usuarios SET activo = NOT activo WHERE id=?')->execute([$id]);
        jsonOk('Usuario actualizado');

    case 'eliminar-usuario':
        $body = getBody(); $id = $body['id'] ?? ''; if (!$id) jsonError('ID requerido');
        if ($id === $sess['usuario_id']) jsonError('No podés eliminarte a vos mismo');
        $db->prepare('DELETE FROM usuarios WHERE id=?')->execute([$id]);
        jsonOk('Usuario eliminado');

    case 'panaderias':
        $stmt = $db->query(
            'SELECT pan.*, u.email, COUNT(DISTINCT p.id) AS total_productos
             FROM panaderias pan JOIN usuarios u ON u.id=pan.usuario_id
             LEFT JOIN productos p ON p.panaderia_id=pan.id
             GROUP BY pan.id ORDER BY pan.created_at DESC'
        );
        jsonOk($stmt->fetchAll());

    case 'toggle-panaderia':
        $body = getBody(); $id = $body['id'] ?? ''; if (!$id) jsonError('ID requerido');
        $db->prepare('UPDATE panaderias SET activo = NOT activo WHERE id=?')->execute([$id]);
        jsonOk('Panadería actualizada');

    case 'pedidos':
        $where = ['1=1']; $params = [];
        if (!empty($_GET['estado']))      { $where[] = 'p.estado=?';       $params[] = $_GET['estado']; }
        if (!empty($_GET['panaderia_id'])){ $where[] = 'p.panaderia_id=?'; $params[] = $_GET['panaderia_id']; }
        $stmt = $db->prepare(
            'SELECT p.*, pan.nombre AS panaderia_nombre FROM pedidos p
             JOIN panaderias pan ON pan.id=p.panaderia_id
             WHERE ' . implode(' AND ', $where) . ' ORDER BY p.created_at DESC LIMIT 200'
        );
        $stmt->execute($params); jsonOk($stmt->fetchAll());

    case 'productos':
        $stmt = $db->query(
            'SELECT p.*, pan.nombre AS panaderia_nombre, c.nombre AS categoria_nombre
             FROM productos p JOIN panaderias pan ON pan.id=p.panaderia_id
             LEFT JOIN categorias c ON c.id=p.categoria_id ORDER BY p.created_at DESC'
        );
        jsonOk($stmt->fetchAll());

    case 'toggle-producto':
        $body = getBody(); $id = $body['id'] ?? ''; if (!$id) jsonError('ID requerido');
        $db->prepare('UPDATE productos SET activo = NOT activo WHERE id=?')->execute([$id]);
        jsonOk('Producto actualizado');

    case 'eliminar-calificacion':
        $body = getBody(); $id = $body['id'] ?? ''; if (!$id) jsonError('ID requerido');
        $db->prepare('DELETE FROM calificaciones WHERE id=?')->execute([$id]);
        jsonOk('Calificación eliminada');

    default:
        jsonError('Acción no válida', 404);
}