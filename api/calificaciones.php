<?php
// Las calificaciones van por api/query.php (upsert).
// Este endpoint sirve para el promedio de un producto.
require_once __DIR__ . '/../config.php';

$productoId = $_GET['producto_id'] ?? '';
if (!$productoId) jsonOut(['error' => 'producto_id requerido']);

try {
    $stmt = getDB()->prepare(
        "SELECT AVG(estrellas) as promedio, COUNT(*) as total
         FROM calificaciones WHERE producto_id = ?"
    );
    $stmt->execute([$productoId]);
    $row = $stmt->fetch();
    jsonOut([
        'promedio' => round((float)($row['promedio'] ?? 0), 1),
        'total'    => (int)($row['total'] ?? 0),
        'error'    => null,
    ]);
} catch (Exception $e) {
    jsonOut(['error' => $e->getMessage()], 500);
}