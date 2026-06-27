<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'listar':
        $where = ['1=1']; $params = [];
        if (!empty($_GET['panaderia_id'])) { $where[] = 'p.panaderia_id = ?'; $params[] = $_GET['panaderia_id']; }
        if (!empty($_GET['categoria_id'])) { $where[] = 'p.categoria_id = ?'; $params[] = (int)$_GET['categoria_id']; }
        if (!empty($_GET['buscar'])) {
            $where[] = '(p.nombre LIKE ? OR p.descripcion LIKE ?)';
            $like = '%' . $_GET['buscar'] . '%'; $params[] = $like; $params[] = $like;
        }
        if (($_GET['solo_activos'] ?? '1') === '1') $where[] = 'p.activo = 1';

        $stmt = $db->prepare(
            'SELECT p.*, c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
                    pan.nombre AS panaderia_nombre,
                    ROUND(COALESCE(AVG(cal.estrellas),0),1) AS rating,
                    COUNT(DISTINCT cal.id) AS total_cal
             FROM productos p
             LEFT JOIN categorias c   ON c.id = p.categoria_id
             LEFT JOIN panaderias pan ON pan.id = p.panaderia_id
             LEFT JOIN calificaciones cal ON cal.producto_id = p.id
             WHERE ' . implode(' AND ', $where) . '
             GROUP BY p.id ORDER BY p.destacado DESC, p.created_at DESC'
        );
        $stmt->execute($params);
        jsonOk($stmt->fetchAll());

    case 'detalle':
        $id = $_GET['id'] ?? '';
        if (!$id) jsonError('ID requerido');
        $stmt = $db->prepare(
            'SELECT p.*, c.nombre AS categoria_nombre, pan.nombre AS panaderia_nombre,
                    ROUND(COALESCE(AVG(cal.estrellas),0),1) AS rating, COUNT(DISTINCT cal.id) AS total_cal
             FROM productos p
             LEFT JOIN categorias c   ON c.id = p.categoria_id
             LEFT JOIN panaderias pan ON pan.id = p.panaderia_id
             LEFT JOIN calificaciones cal ON cal.producto_id = p.id
             WHERE p.id = ? GROUP BY p.id'
        );
        $stmt->execute([$id]);
        $prod = $stmt->fetch();
        if (!$prod) jsonError('Producto no encontrado', 404);
        jsonOk($prod);

    case 'crear':
        $sess   = requireTipo('vendedor', 'admin');
        $body   = getBody();
        $nombre = trim($body['nombre'] ?? '');
        $pan_id = $sess['panaderia_id'] ?? ($body['panaderia_id'] ?? '');
        if (!$nombre) jsonError('El nombre es obligatorio');
        if (!$pan_id) jsonError('Panadería no encontrada');

        $id = generateUUID();
        $db->prepare(
            'INSERT INTO productos (id,panaderia_id,nombre,descripcion,categoria_id,
             precio_unidad,precio_docena,precio_medio,stock,imagen_url,activo,destacado)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $pan_id, $nombre, $body['descripcion'] ?? null,
            $body['categoria_id'] ? (int)$body['categoria_id'] : null,
            (float)($body['precio_unidad'] ?? 0),
            $body['precio_docena'] !== '' ? (float)$body['precio_docena'] : null,
            $body['precio_medio']  !== '' ? (float)$body['precio_medio']  : null,
            (int)($body['stock'] ?? 0), $body['imagen_url'] ?? null,
            (int)(bool)($body['activo']    ?? true),
            (int)(bool)($body['destacado'] ?? false),
        ]);
        jsonOk(['id' => $id], 201);

    case 'editar':
        $sess = requireTipo('vendedor', 'admin');
        $body = getBody(); $id = $body['id'] ?? '';
        if (!$id) jsonError('ID requerido');

        $stmt = $db->prepare('SELECT panaderia_id FROM productos WHERE id = ? LIMIT 1');
        $stmt->execute([$id]); $prod = $stmt->fetch();
        if (!$prod) jsonError('Producto no encontrado', 404);
        if ($sess['tipo'] === 'vendedor' && $prod['panaderia_id'] !== $sess['panaderia_id'])
            jsonError('Sin permiso', 403);

        $db->prepare(
            'UPDATE productos SET nombre=?,descripcion=?,categoria_id=?,precio_unidad=?,
             precio_docena=?,precio_medio=?,stock=?,imagen_url=?,activo=?,destacado=? WHERE id=?'
        )->execute([
            trim($body['nombre'] ?? ''), $body['descripcion'] ?? null,
            $body['categoria_id'] ? (int)$body['categoria_id'] : null,
            (float)($body['precio_unidad'] ?? 0),
            $body['precio_docena'] !== '' ? (float)$body['precio_docena'] : null,
            $body['precio_medio']  !== '' ? (float)$body['precio_medio']  : null,
            (int)($body['stock'] ?? 0), $body['imagen_url'] ?? null,
            (int)(bool)($body['activo'] ?? true), (int)(bool)($body['destacado'] ?? false), $id,
        ]);
        jsonOk('Producto actualizado');

    case 'eliminar':
        $sess = requireTipo('vendedor', 'admin');
        $body = getBody(); $id = $body['id'] ?? '';
        if (!$id) jsonError('ID requerido');
        $stmt = $db->prepare('SELECT panaderia_id FROM productos WHERE id = ? LIMIT 1');
        $stmt->execute([$id]); $prod = $stmt->fetch();
        if (!$prod) jsonError('Producto no encontrado', 404);
        if ($sess['tipo'] === 'vendedor' && $prod['panaderia_id'] !== $sess['panaderia_id'])
            jsonError('Sin permiso', 403);
        $db->prepare('DELETE FROM productos WHERE id = ?')->execute([$id]);
        jsonOk('Producto eliminado');

    case 'categorias':
        jsonOk($db->query('SELECT * FROM categorias ORDER BY id')->fetchAll());

    default:
        jsonError('Acción no válida', 404);
}