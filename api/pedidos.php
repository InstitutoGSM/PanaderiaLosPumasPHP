<?php
// Las operaciones básicas van por api/query.php.
// Este endpoint genera el ticket_id automáticamente al crear un pedido.
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['user_id'])) jsonOut(['error' => 'No autenticado'], 401);

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action === 'crear') {
    try {
        $pdo  = getDB();
        $id   = bin2hex(random_bytes(16));
        $tkId = 'TK-' . strtoupper(substr($id, -8)) . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));

        $items = json_encode($input['items'] ?? []);

        $pdo->prepare("
            INSERT INTO pedidos
              (id, comprador_id, vendedor_id, items, total, estado,
               direccion, codigo_postal, notas, medio_pago,
               nombre_comprador, email_comprador, ticket_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $id,
            $_SESSION['user_id'],
            $input['vendedor_id']    ?? null,
            $items,
            $input['total']          ?? 0,
            'pendiente',
            $input['direccion']      ?? null,
            $input['codigo_postal']  ?? null,
            $input['notas']          ?? null,
            $input['medio_pago']     ?? 'efectivo',
            $input['nombre_comprador'] ?? null,
            $input['email_comprador']  ?? null,
            $tkId,
        ]);

        jsonOut(['data' => ['id' => $id, 'ticket_id' => $tkId], 'error' => null]);
    } catch (Exception $e) {
        jsonOut(['error' => $e->getMessage()], 500);
    }
}

jsonOut(['error' => 'Acción desconocida'], 400);