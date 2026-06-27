<?php
// Las operaciones de productos van por api/query.php.
// Este archivo maneja solo el slug (búsqueda por slug).
require_once __DIR__ . '/../config.php';

$slug = $_GET['slug'] ?? '';
if (!$slug) jsonOut(['error' => 'Slug requerido']);

try {
    $stmt = getDB()->prepare(
        "SELECT p.*, pr.nombre_panaderia, pr.nombre AS nombre_vendedor
         FROM productos p
         LEFT JOIN profiles pr ON p.vendedor_id = pr.id
         WHERE p.slug = ? AND p.activo = 1 LIMIT 1"
    );
    $stmt->execute([$slug]);
    $data = $stmt->fetch();
    jsonOut(['data' => $data ?: null, 'error' => null]);
} catch (Exception $e) {
    jsonOut(['error' => $e->getMessage()], 500);
}