<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') {
    json_response(['ok' => true]);
}

// ── REGISTRO ──
if ($action === 'registro' && $method === 'POST') {
    $body     = get_body();
    $email    = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $nombre   = trim($body['nombre'] ?? '');
    $tipo     = $body['tipo'] ?? 'comprador';
    $panaderia = trim($body['nombre_panaderia'] ?? '');

    if (!$email || !$password || !$nombre) {
        json_response(['error' => 'Faltan campos'], 400);
    }

    $db = getDB();

    // Verificar si ya existe
    $stmt = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_response(['error' => 'El email ya está registrado'], 400);
    }

    $id   = bin2hex(random_bytes(16));
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $db->prepare('INSERT INTO usuarios (id, email, password) VALUES (?, ?, ?)')
       ->execute([$id, $email, $hash]);

    $db->prepare('INSERT INTO profiles (id, nombre, tipo, nombre_panaderia) VALUES (?, ?, ?, ?)')
       ->execute([$id, $nombre, $tipo, $panaderia ?: null]);

    $_SESSION['user_id'] = $id;
    $_SESSION['email']   = $email;

    json_response(['user' => ['id' => $id, 'email' => $email], 'tipo' => $tipo]);
}

// ── LOGIN ──
if ($action === 'login' && $method === 'POST') {
    $body     = get_body();
    $email    = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$email || !$password) {
        json_response(['error' => 'Faltan campos'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT u.*, p.tipo FROM usuarios u JOIN profiles p ON p.id = u.id WHERE u.email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        json_response(['error' => 'Email o contraseña incorrectos'], 401);
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email']   = $user['email'];

    json_response(['user' => ['id' => $user['id'], 'email' => $user['email']], 'tipo' => $user['tipo']]);
}

// ── LOGOUT ──
if ($action === 'logout' && $method === 'POST') {
    session_destroy();
    json_response(['ok' => true]);
}

// ── OBT SESSION ──
if ($action === 'session' && $method === 'GET') {
    if (isset($_SESSION['user_id'])) {
        json_response(['user' => ['id' => $_SESSION['user_id'], 'email' => $_SESSION['email']]]);
    } else {
        json_response(['user' => null]);
    }
}

json_response(['error' => 'Acción no encontrada'], 404);
?>