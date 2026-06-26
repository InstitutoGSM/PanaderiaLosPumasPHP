<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── TODOS LOS PRODUCTOS (activos) ──
if ($action === 'todos' && $method === 'GET') {
    $db   = getDB();
    $stmt = $db->query('
        SELECT p.*, pr.nombre_panaderia, pr.nombre AS nombre_vendedor, pr.avatar_url
        FROM productos p
        LEFT JOIN profiles pr ON pr.id = p.vendedor_id
        WHERE p.activo = 1
        ORDER BY p.created_at DESC
    ');
    $productos = $stmt->fetchAll();

    $cals = $db->query('SELECT producto_id, estrellas FROM calificaciones')->fetchAll();
    $map  = [];
    foreach ($cals as $c) $map[$c['producto_id']][] = $c['estrellas'];

    foreach ($productos as &$p) {
        $vals = $map[$p['id']] ?? [];
        $p['promedio']        = count($vals) ? array_sum($vals) / count($vals) : 0;
        $p['nombre_panaderia'] = $p['nombre_panaderia'] ?? $p['nombre_vendedor'] ?? 'Panadería';
    }
    json_response($productos);
}

// ── CONTAR ACTIVOS (para stats del home) ──
if ($action === 'contar_activos' && $method === 'GET') {
    $db   = getDB();
    $stmt = $db->query('SELECT COUNT(*) AS total FROM productos WHERE activo = 1');
    $row  = $stmt->fetch();
    json_response(['count' => (int)$row['total']]);
}

// ── PRODUCTOS POR VENDEDOR (todos, inc. inactivos — para panel del vendedor) ──
if ($action === 'por_vendedor' && $method === 'GET') {
    $vendedor_id = $_GET['vendedor_id'] ?? '';
    if (!$vendedor_id) json_response(['error' => 'Falta vendedor_id'], 400);

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT * FROM productos
        WHERE vendedor_id = ?
        ORDER BY created_at DESC
    ');
    $stmt->execute([$vendedor_id]);
    json_response($stmt->fetchAll());
}

// ── UN PRODUCTO ──
if ($action === 'uno' && $method === 'GET') {
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT p.*, pr.nombre_panaderia, pr.nombre AS nombre_vendedor,
               pr.telefono, pr.avatar_url
        FROM productos p
        LEFT JOIN profiles pr ON pr.id = p.vendedor_id
        WHERE p.id = ?
    ');
    $stmt->execute([$id]);
    $prod = $stmt->fetch();
    if (!$prod) json_response(['error' => 'No encontrado'], 404);

    $fotos = $db->prepare('SELECT * FROM producto_fotos WHERE producto_id = ? ORDER BY orden');
    $fotos->execute([$id]);
    $prod['fotos'] = $fotos->fetchAll();

    json_response($prod);
}

// ── CREAR ──
if ($action === 'crear' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $id   = bin2hex(random_bytes(16));
    $db   = getDB();

    $db->prepare('
        INSERT INTO productos
        (id, vendedor_id, nombre, descripcion, precio, precio_docena,
         precio_media_docena, categoria, imagen_url, cantidad_disponible,
         dato_extra, activo, unidad_venta)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ')->execute([
        $id,
        $_SESSION['user_id'],
        $body['nombre']              ?? '',
        $body['descripcion']         ?? null,
        $body['precio']              ?? 0,
        $body['precio_docena']       ?? null,
        $body['precio_media_docena'] ?? null,
        $body['categoria']           ?? null,
        $body['imagen_url']          ?? null,
        $body['cantidad_disponible'] ?? 0,
        $body['dato_extra']          ?? null,
        $body['activo']              ?? 1,
        $body['unidad_venta']        ?? 'unidad',
    ]);

    json_response(['id' => $id, 'ok' => true]);
}

// ── ACTUALIZAR ──
if ($action === 'actualizar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $id   = $body['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db = getDB();
    $db->prepare('
        UPDATE productos SET
          nombre = ?, descripcion = ?, precio = ?, precio_docena = ?,
          precio_media_docena = ?, categoria = ?, imagen_url = ?,
          cantidad_disponible = ?, dato_extra = ?, activo = ?, unidad_venta = ?
        WHERE id = ? AND vendedor_id = ?
    ')->execute([
        $body['nombre']              ?? '',
        $body['descripcion']         ?? null,
        $body['precio']              ?? 0,
        $body['precio_docena']       ?? null,
        $body['precio_media_docena'] ?? null,
        $body['categoria']           ?? null,
        $body['imagen_url']          ?? null,
        $body['cantidad_disponible'] ?? 0,
        $body['dato_extra']          ?? null,
        $body['activo']              ?? 1,
        $body['unidad_venta']        ?? 'unidad',
        $id,
        $_SESSION['user_id'],
    ]);

    json_response(['ok' => true]);
}

// ── ELIMINAR ──
if ($action === 'eliminar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $id   = $body['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db = getDB();
    $db->prepare('DELETE FROM productos WHERE id = ? AND vendedor_id = ?')
       ->execute([$id, $_SESSION['user_id']]);

    json_response(['ok' => true]);
}

// ── PANADERÍAS (todas activas) ──
if ($action === 'panaderias' && $method === 'GET') {
    $db   = getDB();
    $stmt = $db->query('
        SELECT id, nombre_panaderia, nombre, avatar_url, descripcion
        FROM profiles
        WHERE tipo = "vendedor"
        ORDER BY nombre_panaderia ASC
    ');
    json_response($stmt->fetchAll());
}

json_response(['error' => 'Acción no encontrada'], 404);
?>