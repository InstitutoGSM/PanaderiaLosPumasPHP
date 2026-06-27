<?php
// Guarda los ultimos 4 dígitos de tarjeta (nunca el num completo).
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['user_id'])) jsonOut(['error' => 'No autenticado'], 401);

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

try {
    $pdo = getDB();

    if ($action === 'guardar') {
        $ultimos4 = preg_replace('/\D/', '', $input['ultimos_4'] ?? '');
        $tipo     = $input['tipo'] ?? 'desconocida';
        if (strlen($ultimos4) !== 4) jsonOut(['error' => 'Últimos 4 dígitos inválidos']);

        // Upsert: 1 tarjeta por usuario
        $stmt = $pdo->prepare("SELECT id FROM tarjetas WHERE user_id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $existing = $stmt->fetch();

        if ($existing) {
            $pdo->prepare("UPDATE tarjetas SET ultimos_4=?, numero_enmascarado=?, tipo=? WHERE user_id=?")
                ->execute(["•••• •••• •••• $ultimos4", "•••• •••• •••• $ultimos4", $tipo, $_SESSION['user_id']]);
        } else {
            $id = bin2hex(random_bytes(16));
            $pdo->prepare("INSERT INTO tarjetas (id,user_id,numero_enmascarado,ultimos_4,tipo) VALUES (?,?,?,?,?)")
                ->execute([$id, $_SESSION['user_id'], "•••• •••• •••• $ultimos4", $ultimos4, $tipo]);
        }
        jsonOut(['ok' => true]);
    }

    jsonOut(['error' => 'Acción desconocida'], 400);
} catch (Exception $e) {
    jsonOut(['error' => $e->getMessage()], 500);
}