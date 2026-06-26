<!-- SOLO SE EJECUTA 1 VEZ, ESTO CREA EL ADMIN
                 YA EJECUTADO! -->

<?php
require_once 'config.php';

$email    = 'admin@panaderia.com';
$password = 'Admin1234';
$nombre   = 'Administrador';

$db   = getDB();
$id   = bin2hex(random_bytes(16));
$hash = password_hash($password, PASSWORD_DEFAULT);

$check = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    die('⚠️ El admin ya existe.');
}

$db->prepare('INSERT INTO usuarios (id, email, password) VALUES (?, ?, ?)')
   ->execute([$id, $email, $hash]);

$db->prepare('INSERT INTO profiles (id, nombre, tipo, estado_verificacion) VALUES (?, ?, ?, ?)')
   ->execute([$id, $nombre, 'admin', 'aprobado']);

echo '✅ Admin creado. Email: ' . $email . ' | Pass: ' . $password;
?>