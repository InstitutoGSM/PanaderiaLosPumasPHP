<?php
require_once __DIR__ . '/db.php';
if (session_status() === PHP_SESSION_NONE) session_start();

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

switch ($action) {

    case 'session':
        if (!empty($_SESSION['usuario_id'])) {
            jsonOk([
                'usuario_id'   => $_SESSION['usuario_id'],
                'email'        => $_SESSION['email'],
                'nombre'       => $_SESSION['nombre'],
                'tipo'         => $_SESSION['tipo'],
                'panaderia_id' => $_SESSION['panaderia_id'] ?? null,
            ]);
        }
        jsonOk(null);

    case 'login':
        $body  = getBody();
        $email = trim($body['email'] ?? '');
        $pass  = $body['password'] ?? '';
        if (!$email || !$pass) jsonError('Email y contraseña requeridos');

        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($pass, $user['password_hash'])) {
            jsonError('Email o contraseña incorrectos', 401);
        }

        $panaderia_id = null;
        if ($user['tipo'] === 'vendedor') {
            $p = $db->prepare('SELECT id FROM panaderias WHERE usuario_id = ? LIMIT 1');
            $p->execute([$user['id']]);
            $pan = $p->fetch();
            $panaderia_id = $pan['id'] ?? null;
        }

        $_SESSION['usuario_id']   = $user['id'];
        $_SESSION['email']        = $user['email'];
        $_SESSION['nombre']       = $user['nombre'];
        $_SESSION['tipo']         = $user['tipo'];
        $_SESSION['panaderia_id'] = $panaderia_id;

        jsonOk([
            'usuario_id'   => $user['id'],
            'email'        => $user['email'],
            'nombre'       => $user['nombre'],
            'tipo'         => $user['tipo'],
            'panaderia_id' => $panaderia_id,
        ]);

    case 'register':
        $body   = getBody();
        $email  = trim($body['email'] ?? '');
        $pass   = $body['password'] ?? '';
        $nombre = trim($body['nombre'] ?? '');
        $tipo   = $body['tipo'] ?? 'comprador';

        if (!$email || !$pass || !$nombre) jsonError('Todos los campos son obligatorios');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Email inválido');
        if (strlen($pass) < 6) jsonError('La contraseña debe tener al menos 6 caracteres');
        if (!in_array($tipo, ['comprador', 'vendedor'], true)) jsonError('Tipo inválido');

        $db    = getDB();
        $check = $db->prepare('SELECT id FROM usuarios WHERE email = ? LIMIT 1');
        $check->execute([$email]);
        if ($check->fetch()) jsonError('El email ya está registrado');

        $id   = generateUUID();
        $hash = password_hash($pass, PASSWORD_BCRYPT);
        $db->prepare('INSERT INTO usuarios (id, email, password_hash, nombre, tipo) VALUES (?,?,?,?,?)')
           ->execute([$id, $email, $hash, $nombre, $tipo]);

        $panaderia_id = null;
        if ($tipo === 'vendedor') {
            $pan_id = generateUUID();
            $db->prepare('INSERT INTO panaderias (id, usuario_id, nombre) VALUES (?,?,?)')
               ->execute([$pan_id, $id, $nombre]);
            $panaderia_id = $pan_id;
        }

        $_SESSION['usuario_id']   = $id;
        $_SESSION['email']        = $email;
        $_SESSION['nombre']       = $nombre;
        $_SESSION['tipo']         = $tipo;
        $_SESSION['panaderia_id'] = $panaderia_id;

        jsonOk(['usuario_id' => $id, 'email' => $email, 'nombre' => $nombre,
                'tipo' => $tipo, 'panaderia_id' => $panaderia_id], 201);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        jsonOk('Sesión cerrada');

    case 'reset-request':
        $body  = getBody();
        $email = trim($body['email'] ?? '');
        if (!$email) jsonError('Email requerido');

        $db   = getDB();
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) jsonOk('Si el email existe, recibirás el enlace');

        $token  = bin2hex(random_bytes(32));
        $expira = date('Y-m-d H:i:s', strtotime('+1 hour'));
        $db->prepare('INSERT INTO reset_tokens (usuario_id, token, expira_en) VALUES (?,?,?)')
           ->execute([$user['id'], $token, $expira]);

        jsonOk(['token' => $token, 'mensaje' => 'Token generado']);

    case 'reset-password':
        $body  = getBody();
        $token = $body['token'] ?? '';
        $pass  = $body['password'] ?? '';
        if (!$token || !$pass) jsonError('Token y contraseña requeridos');
        if (strlen($pass) < 6) jsonError('La contraseña debe tener al menos 6 caracteres');

        $db   = getDB();
        $stmt = $db->prepare(
            'SELECT * FROM reset_tokens WHERE token = ? AND usado = 0 AND expira_en > NOW() LIMIT 1'
        );
        $stmt->execute([$token]);
        $rt = $stmt->fetch();
        if (!$rt) jsonError('Token inválido o expirado', 401);

        $db->prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
           ->execute([password_hash($pass, PASSWORD_BCRYPT), $rt['usuario_id']]);
        $db->prepare('UPDATE reset_tokens SET usado = 1 WHERE id = ?')->execute([$rt['id']]);
        jsonOk('Contraseña actualizada');

    case 'update-perfil':
        $sess   = requireAuth();
        $body   = getBody();
        $nombre = trim($body['nombre'] ?? '');
        if (!$nombre) jsonError('El nombre es obligatorio');

        getDB()->prepare('UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?')
               ->execute([$nombre, $body['telefono'] ?? null, $sess['usuario_id']]);
        $_SESSION['nombre'] = $nombre;
        jsonOk('Perfil actualizado');

    default:
        jsonError('Acción no válida', 404);
}