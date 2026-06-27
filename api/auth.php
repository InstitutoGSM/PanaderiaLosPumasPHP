<?php
require_once __DIR__ . '/../config.php';

// Tablas permitidas para proteger contra inyección
$ALLOWED_TABLES = [
    'profiles','productos','producto_fotos','pedidos',
    'calificaciones','documentos','sucursales','tarjetas','carrito'
];

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {

    // ── Obtener sesion actual ──────────────────────────────────
    case 'getSession':
        if (!empty($_SESSION['user_id'])) {
            jsonOut(['session' => [
                'id'    => $_SESSION['user_id'],
                'email' => $_SESSION['email'],
            ]]);
        }
        jsonOut(['session' => null]);
        break;

    // ── Login ─────────────────────────────────────────────────
    case 'login':
        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        if (!$email || !$password) jsonOut(['error' => 'Email y contraseña requeridos']);

        try {
            $pdo  = getDB();
            $stmt = $pdo->prepare("SELECT id, email, password FROM usuarios WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                jsonOut(['error' => 'Email o contraseña incorrectos']);
            }

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['email']   = $user['email'];

            jsonOut(['user' => ['id' => $user['id'], 'email' => $user['email']]]);
        } catch (Exception $e) {
            jsonOut(['error' => 'Error de base de datos']);
        }
        break;

    // ── Registro ──────────────────────────────────────────────
    case 'register':
        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        if (!$email || !$password) jsonOut(['error' => 'Email y contraseña requeridos']);

        try {
            $pdo = getDB();

            // Verifica si ya existe
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            if ($stmt->fetch()) jsonOut(['error' => 'El email ya está registrado']);

            $id   = bin2hex(random_bytes(16));
            $hash = password_hash($password, PASSWORD_BCRYPT);

            $pdo->prepare("INSERT INTO usuarios (id, email, password) VALUES (?, ?, ?)")
                ->execute([$id, $email, $hash]);

            $_SESSION['user_id'] = $id;
            $_SESSION['email']   = $email;

            jsonOut(['user' => ['id' => $id, 'email' => $email]]);
        } catch (Exception $e) {
            jsonOut(['error' => 'Error al registrar: ' . $e->getMessage()]);
        }
        break;

    // ── Logout ────────────────────────────────────────────────
    case 'logout':
        session_destroy();
        jsonOut(['ok' => true]);
        break;

    // ── Cambiar contraseña (usuario logueado) ─────────────────
    case 'updatePassword':
        if (empty($_SESSION['user_id'])) jsonOut(['error' => 'No autenticado']);
        $password = $input['password'] ?? '';
        if (strlen($password) < 8) jsonOut(['error' => 'Mínimo 8 caracteres']);

        try {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            getDB()->prepare("UPDATE usuarios SET password = ? WHERE id = ?")
                   ->execute([$hash, $_SESSION['user_id']]);
            jsonOut(['ok' => true]);
        } catch (Exception $e) {
            jsonOut(['error' => 'Error al actualizar contraseña']);
        }
        break;

    // ── Solicitar reset de contraseña ─────────────────────────
    case 'resetPassword':
        $email      = trim($input['email'] ?? '');
        $redirectTo = $input['redirectTo'] ?? '';
        if (!$email) jsonOut(['error' => 'Email requerido']);

        try {
            $pdo  = getDB();
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user) {
                $token   = bin2hex(random_bytes(32));
                $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
                $pdo->prepare(
                    "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)"
                )->execute([$email, $token, $expires]);

                $link = str_replace('login.php', 'reset-password.php', $redirectTo)
                      . '?token=' . $token;
                file_put_contents(
                    __DIR__ . '/../reset_tokens_dev.log',
                    date('Y-m-d H:i:s') . " | $email | $link\n",
                    FILE_APPEND
                );
            }
            // Siempre responder OK (no revelar si el email existe)
            jsonOut(['ok' => true]);
        } catch (Exception $e) {
            jsonOut(['error' => 'Error al procesar']);
        }
        break;

    // ── Validar token de reset ────────────────────────────────
    case 'validateResetToken':
        $token = $input['token'] ?? '';
        if (!$token) jsonOut(['valid' => false]);
        try {
            $stmt = getDB()->prepare(
                "SELECT email FROM password_resets
                 WHERE token = ? AND expires_at > NOW() AND used = 0 LIMIT 1"
            );
            $stmt->execute([$token]);
            $row = $stmt->fetch();
            jsonOut(['valid' => (bool)$row, 'email' => $row['email'] ?? null]);
        } catch (Exception $e) {
            jsonOut(['valid' => false]);
        }
        break;

    // ── Cambiar contraseña con token ──────────────────────────
    case 'resetPasswordWithToken':
        $token    = $input['token'] ?? '';
        $password = $input['password'] ?? '';
        if (!$token || strlen($password) < 8) jsonOut(['error' => 'Datos inválidos']);

        try {
            $pdo  = getDB();
            $stmt = $pdo->prepare(
                "SELECT email FROM password_resets
                 WHERE token = ? AND expires_at > NOW() AND used = 0 LIMIT 1"
            );
            $stmt->execute([$token]);
            $row = $stmt->fetch();
            if (!$row) jsonOut(['error' => 'Token inválido o expirado']);

            $hash = password_hash($password, PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE usuarios SET password = ? WHERE email = ?")
                ->execute([$hash, $row['email']]);
            $pdo->prepare("UPDATE password_resets SET used = 1 WHERE token = ?")
                ->execute([$token]);
            jsonOut(['ok' => true]);
        } catch (Exception $e) {
            jsonOut(['error' => 'Error al cambiar contraseña']);
        }
        break;

    default:
        jsonOut(['error' => 'Acción desconocida'], 400);
}