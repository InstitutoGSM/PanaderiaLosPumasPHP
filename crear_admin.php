<?php
require_once 'config.php';

$msg = '';
$ok  = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email  = trim($_POST['email']  ?? '');
    $pass   = trim($_POST['pass']   ?? '');
    $nombre = trim($_POST['nombre'] ?? '');

    if (!$email || !$pass || !$nombre) {
        $msg = 'Completá todos los campos.';
    } elseif (strlen($pass) < 8) {
        $msg = 'La contraseña necesita al menos 8 caracteres.';
    } else {
        try {
            $pdo = getDB();

            // Verificar que no exista
            $chk = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
            $chk->execute([$email]);
            if ($chk->fetch()) {
                $msg = 'Ese email ya está registrado.';
            } else {
                $id   = bin2hex(random_bytes(16));
                $hash = password_hash($pass, PASSWORD_BCRYPT);

                $pdo->prepare("INSERT INTO usuarios (id, email, password) VALUES (?, ?, ?)")
                    ->execute([$id, $email, $hash]);

                $pdo->prepare("INSERT INTO profiles (id, nombre, tipo) VALUES (?, ?, 'admin')")
                    ->execute([$id, $nombre]);

                $ok  = true;
                $msg = "✅ Admin creado correctamente. Ya podés iniciar sesión en admin-login.php";
            }
        } catch (Exception $e) {
            $msg = 'Error: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Crear Admin — PanaderiaMarket</title>
    <style>
        body { font-family: sans-serif; max-width: 420px; margin: 60px auto; padding: 24px; }
        input { width: 100%; padding: 10px; margin: 8px 0 16px; box-sizing: border-box;
                border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
        button { width: 100%; padding: 12px; background: #c0392b; color: white;
                 border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
        .msg { padding: 12px; border-radius: 6px; margin-bottom: 16px;
               background: <?= $ok ? '#d4edda' : '#f8d7da' ?>;
               color: <?= $ok ? '#155724' : '#721c24' ?>; }
        h2 { margin-bottom: 24px; }
    </style>
</head>
<body>
    <h2>⚙️ Crear Administrador</h2>
    <p style="color:#666;font-size:.9rem">
        ⚠️ Eliminá o protegé este archivo una vez creado el admin.
    </p>

    <?php if ($msg): ?>
        <div class="msg"><?= htmlspecialchars($msg) ?></div>
    <?php endif; ?>

    <?php if (!$ok): ?>
    <form method="POST">
        <label>Nombre completo</label>
        <input type="text" name="nombre" required placeholder="Ej: Carlos López">

        <label>Email</label>
        <input type="email" name="email" required placeholder="admin@panaderia.com">

        <label>Contraseña (mín. 8 caracteres)</label>
        <input type="password" name="pass" required>

        <button type="submit">Crear admin</button>
    </form>
    <?php endif; ?>
</body>
</html>