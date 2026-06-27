<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') json_response(['ok' => true]);

// ── OBT PERFIL ──
if ($action === 'get' && $method === 'GET') {
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM profiles WHERE id = ?');
    $stmt->execute([$id]);
    $perfil = $stmt->fetch();

    if (!$perfil) json_response(['error' => 'No encontrado'], 404);
    json_response($perfil);
}

// ── ACTUALIZAR PERFIL ──
if ($action === 'actualizar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $db   = getDB();

    $db->prepare('
        UPDATE profiles SET
        nombre = ?, nombre_panaderia = ?, descripcion = ?,
        instagram = ?, telefono = ?, email_contacto = ?, banner_anuncio = ?,
        cbu = ?, alias_cbu = ?, titular_cuenta = ?, medios_pago = ?,
        avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
    ')->execute([
        $body['nombre']           ?? null,
        $body['nombre_panaderia'] ?? null,
        $body['descripcion']      ?? null,
        $body['instagram']        ?? null,
        $body['telefono']         ?? null,
        $body['email_contacto']   ?? null,
        $body['banner_anuncio']   ?? null,
        $body['cbu']              ?? null,
        $body['alias_cbu']        ?? null,
        $body['titular_cuenta']   ?? null,
        isset($body['medios_pago']) ? json_encode($body['medios_pago']) : null,
        $body['avatar_url']       ?? null,
        $_SESSION['user_id'],
    ]);

    json_response(['ok' => true]);
}

// ── ACTUALIZAR AVATAR ──
if ($action === 'avatar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    if (!isset($_FILES['avatar'])) json_response(['error' => 'Falta archivo'], 400);

    $file    = $_FILES['avatar'];
    $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp'];

    if (!in_array($ext, $allowed)) json_response(['error' => 'Formato no permitido'], 400);
    if ($file['size'] > 2 * 1024 * 1024) json_response(['error' => 'Máx 2MB'], 400);

    $carpeta = '../assets/avatares/';
    if (!is_dir($carpeta)) mkdir($carpeta, 0777, true);

    $nombre = $_SESSION['user_id'] . '.' . $ext;
    move_uploaded_file($file['tmp_name'], $carpeta . $nombre);

    $url = 'assets/avatares/' . $nombre;

    $db = getDB();
    $db->prepare('UPDATE profiles SET avatar_url = ? WHERE id = ?')
        ->execute([$url, $_SESSION['user_id']]);

    json_response(['url' => $url]);
}

// ── LISTAR TODOS LOS VENDEDORES (solo admin) ──
if ($action === 'listar_vendedores' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $self = $db->prepare('SELECT tipo FROM profiles WHERE id = ?');
    $self->execute([$_SESSION['user_id']]);
    $me = $self->fetch();
    if (!$me || $me['tipo'] !== 'admin') json_response(['error' => 'Prohibido'], 403);

    $stmt = $db->query('
        SELECT * FROM profiles
        WHERE tipo = "vendedor"
        ORDER BY created_at DESC
    ');
    json_response($stmt->fetchAll());
}

// ── APROBAR VENDEDOR (solo admin) ──
if ($action === 'aprobar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $self = $db->prepare('SELECT tipo FROM profiles WHERE id = ?');
    $self->execute([$_SESSION['user_id']]);
    $me = $self->fetch();
    if (!$me || $me['tipo'] !== 'admin') json_response(['error' => 'Prohibido'], 403);

    $body = get_body();
    $id   = $body['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db->prepare('
        UPDATE profiles
        SET estado_verificacion = "aprobado", doc_notas_rechazo = NULL
        WHERE id = ?
    ')->execute([$id]);

    json_response(['ok' => true]);
}

// ── RECHAZAR VENDEDOR (solo admin) ──
if ($action === 'rechazar' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $self = $db->prepare('SELECT tipo FROM profiles WHERE id = ?');
    $self->execute([$_SESSION['user_id']]);
    $me = $self->fetch();
    if (!$me || $me['tipo'] !== 'admin') json_response(['error' => 'Prohibido'], 403);

    $body = get_body();
    $id   = $body['id'] ?? '';
    if (!$id) json_response(['error' => 'Falta id'], 400);

    $db->prepare('
        UPDATE profiles SET estado_verificacion = "rechazado" WHERE id = ?
    ')->execute([$id]);

    json_response(['ok' => true]);
}

if ($action === 'corregir' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $self = $db->prepare('SELECT tipo FROM profiles WHERE id = ?');
    $self->execute([$_SESSION['user_id']]);
    $me = $self->fetch();
    if (!$me || $me['tipo'] !== 'admin') json_response(['error' => 'Prohibido'], 403);

    $body    = get_body();
    $id      = $body['id']      ?? '';
    $mensaje = $body['mensaje'] ?? '';
    if (!$id || !$mensaje) json_response(['error' => 'Faltan datos'], 400);

    $db->prepare('
        UPDATE profiles
        SET estado_verificacion = "sin_enviar", doc_notas_rechazo = ?
        WHERE id = ?
    ')->execute([$mensaje, $id]);

    json_response(['ok' => true]);
}

// ── GUARDAR DOCUMENTOS DE VERIFICACIÓN ──
if ($action === 'guardar_docs' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body = get_body();
    $db   = getDB();

    $campos = [];
    $vals   = [];

    foreach (['doc_bromatologia', 'doc_carnet_manipulador', 'doc_habilitacion_comercial'] as $campo) {
        if (isset($body[$campo])) {
            $campos[] = "$campo = ?";
            $vals[]   = $body[$campo];
        }
    }

    if (empty($campos)) json_response(['error' => 'Sin datos'], 400);

    // Si tiene los 3 docs, pasa a pendiente automáticamente
    $stmt = $db->prepare('SELECT doc_bromatologia, doc_carnet_manipulador, doc_habilitacion_comercial FROM profiles WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $current = $stmt->fetch();

    $merged = array_merge($current, $body);
    if ($merged['doc_bromatologia'] && $merged['doc_carnet_manipulador'] && $merged['doc_habilitacion_comercial']) {
        $campos[] = 'estado_verificacion = ?';
        $vals[]   = 'pendiente';
    }

    $vals[] = $_SESSION['user_id'];
    $db->prepare('UPDATE profiles SET ' . implode(', ', $campos) . ' WHERE id = ?')
        ->execute($vals);

    json_response(['ok' => true]);
}

// ── LISTAR SUCURSALES ──
if ($action === 'listar_sucursales' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM profiles WHERE panaderia_padre_id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    json_response($stmt->fetchAll());
}

// ── BUSCAR PANADERÍA POR EMAIL (para vincular) ──
if ($action === 'buscar_por_email' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $email = trim($_GET['email'] ?? '');
    if (!$email) json_response(['error' => 'Falta email'], 400);

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT id, nombre_panaderia, nombre, avatar_url, es_sucursal, panaderia_padre_id
        FROM profiles WHERE email_contacto = ? AND tipo = "vendedor"
    ');
    $stmt->execute([$email]);
    $data = $stmt->fetch();

    if (!$data) json_response(['error' => 'No encontrado'], 404);
    json_response($data);
}

// ── VINCULAR SUCURSAL ──
if ($action === 'vincular_sucursal' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body  = get_body();
    $sucId = $body['sucursal_id'] ?? '';
    if (!$sucId) json_response(['error' => 'Falta sucursal_id'], 400);

    $db = getDB();
    $db->prepare('UPDATE profiles SET panaderia_padre_id = ?, es_sucursal = 1 WHERE id = ?')
        ->execute([$_SESSION['user_id'], $sucId]);

    json_response(['ok' => true]);
}

// ── DESVINCULAR SUCURSAL ──
if ($action === 'desvincular_sucursal' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body  = get_body();
    $sucId = $body['sucursal_id'] ?? '';
    if (!$sucId) json_response(['error' => 'Falta sucursal_id'], 400);

    $db = getDB();
    $db->prepare('UPDATE profiles SET panaderia_padre_id = NULL, es_sucursal = 0 WHERE id = ? AND panaderia_padre_id = ?')
        ->execute([$sucId, $_SESSION['user_id']]);

    json_response(['ok' => true]);
}

// ── CREAR SUCURSAL NUEVA ──
if ($action === 'crear_sucursal' && $method === 'POST') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $body      = get_body();
    $nombre    = trim($body['nombre']      ?? '');
    $panaderia = trim($body['panaderia']   ?? '');
    $email     = trim($body['email']       ?? '');
    $password  = $body['password']         ?? '';

    if (!$nombre || !$panaderia || !$email || !$password)
        json_response(['error' => 'Faltan campos'], 400);
    if (strlen($password) < 8)
        json_response(['error' => 'Contraseña mínimo 8 caracteres'], 400);

    $db = getDB();

    $check = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) json_response(['error' => 'El email ya está registrado'], 400);

    $id   = bin2hex(random_bytes(16));
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $db->prepare('INSERT INTO usuarios (id, email, password) VALUES (?,?,?)')->execute([$id, $email, $hash]);
    $db->prepare('INSERT INTO profiles (id, nombre, nombre_panaderia, tipo, es_sucursal, panaderia_padre_id, estado_verificacion) VALUES (?,?,?,?,?,?,?)')
        ->execute([$id, $nombre, $panaderia, 'vendedor', 1, $_SESSION['user_id'], 'sin_enviar']);

    json_response(['ok' => true, 'id' => $id]);
}

// ── MÉTRICAS DE UNA SUCURSAL ──
if ($action === 'metricas_sucursal' && $method === 'GET') {
    if (!isset($_SESSION['user_id'])) json_response(['error' => 'No autorizado'], 401);

    $sucId = $_GET['sucursal_id'] ?? '';
    if (!$sucId) json_response(['error' => 'Falta sucursal_id'], 400);

    $db = getDB();

    // Verificar que es sucursal del usuario actual
    $check = $db->prepare('SELECT id FROM profiles WHERE id = ? AND panaderia_padre_id = ?');
    $check->execute([$sucId, $_SESSION['user_id']]);
    if (!$check->fetch()) json_response(['error' => 'No autorizado'], 403);

    $pedidos = $db->prepare('SELECT total, estado, created_at FROM pedidos WHERE vendedor_id = ?');
    $pedidos->execute([$sucId]);
    $pedidosData = $pedidos->fetchAll();

    $prods = $db->prepare('SELECT COUNT(*) as total FROM productos WHERE vendedor_id = ? AND activo = 1');
    $prods->execute([$sucId]);
    $prodsData = $prods->fetch();

    $ultimos = $db->prepare('SELECT * FROM pedidos WHERE vendedor_id = ? ORDER BY created_at DESC LIMIT 3');
    $ultimos->execute([$sucId]);
    $ultimosData = $ultimos->fetchAll();
    foreach ($ultimosData as &$p) $p['items'] = json_decode($p['items'], true);

    json_response([
        'pedidos'      => $pedidosData,
        'total_prods'  => $prodsData['total'] ?? 0,
        'ultimos'      => $ultimosData,
    ]);
}

json_response(['error' => 'Acción no encontrada'], 404);
