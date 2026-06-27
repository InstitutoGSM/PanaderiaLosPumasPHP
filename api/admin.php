<?php
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['user_id'])) jsonOut(['error' => 'No autenticado'], 401);

// Verificar que sea admin
$stmt = getDB()->prepare("SELECT tipo FROM profiles WHERE id = ? LIMIT 1");
$stmt->execute([$_SESSION['user_id']]);
$p = $stmt->fetch();
if (!$p || $p['tipo'] !== 'admin') jsonOut(['error' => 'No autorizado'], 403);

$input  = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$vid    = $input['vendedor_id'] ?? '';

try {
    switch ($action) {
        case 'aprobar':
            getDB()->prepare("UPDATE profiles SET estado_verificacion='aprobado' WHERE id=?")
                   ->execute([$vid]);
            jsonOut(['ok' => true]);
            break;

        case 'rechazar':
            getDB()->prepare("UPDATE profiles SET estado_verificacion='rechazado' WHERE id=?")
                   ->execute([$vid]);
            jsonOut(['ok' => true]);
            break;

        case 'pedir_correccion':
            getDB()->prepare("UPDATE profiles SET estado_verificacion='pendiente' WHERE id=?")
                   ->execute([$vid]);
            // En producción acá iría el envío de email con el mensaje
            jsonOut(['ok' => true]);
            break;

        default:
            jsonOut(['error' => 'Acción desconocida'], 400);
    }
} catch (Exception $e) {
    jsonOut(['error' => $e->getMessage()], 500);
}