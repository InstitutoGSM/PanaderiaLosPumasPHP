<?php
require_once __DIR__ . '/../config.php';

// Tablas permitidas
const ALLOWED_TABLES = [
    'profiles', 'productos', 'producto_fotos', 'pedidos',
    'calificaciones', 'documentos', 'sucursales', 'tarjetas', 'carrito'
];

// Columnas JSON que deben decodificarse al devolver
const JSON_COLUMNS = ['items', 'medios_pago', 'fotos_extra'];

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) jsonOut(['error' => 'JSON inválido'], 400);

$action = $input['action'] ?? 'select';
$table  = $input['table']  ?? '';

if (!in_array($table, ALLOWED_TABLES, true)) {
    jsonOut(['error' => "Tabla no permitida: $table"], 403);
}

$filters = $input['filters'] ?? [];
$pdo     = getDB();

try {
    switch ($action) {

        // ── SELECT ───────────────────────────────────────────
        case 'select': {
            $selectStr   = $input['select']    ?? '*';
            $order       = $input['order']     ?? null;
            $limitN      = $input['limit']     ?? null;
            $singleRow   = $input['single']    ?? false;
            $countOnly   = $input['countOnly'] ?? false;

            $joinTable  = null;
            $joinCols   = [];
            if (preg_match('/\*\s*,\s*(\w+)\(([^)]+)\)/', $selectStr, $m)) {
                $joinTable  = $m[1];
                $joinColArr = array_map('trim', explode(',', $m[2]));
                if (in_array($joinTable, ALLOWED_TABLES, true)) {
                    foreach ($joinColArr as $col) {
                        $safeCol   = preg_replace('/[^a-zA-Z0-9_]/', '', $col);
                        $joinCols[] = "$joinTable.$safeCol AS {$joinTable}__{$safeCol}";
                    }
                    $selectStr = "$table.*";
                } else {
                    $joinTable = null;
                }
            }

            if ($countOnly) {
                $sql = "SELECT COUNT(*) AS cnt FROM `$table`";
            } else {
                $colsSql = buildSelectCols($selectStr);
                $sql = "SELECT $colsSql";
                if ($joinCols) $sql .= ', ' . implode(', ', $joinCols);
                $sql .= " FROM `$table`";
            }

            // JOIN
            if ($joinTable) {
                $fk = ($table === 'productos') ? 'vendedor_id' : 'id';
                $sql .= " LEFT JOIN `$joinTable` ON `$table`.`$fk` = `$joinTable`.`id`";
            }

            // WHERE
            [$where, $bindings] = buildWhere($filters);
            if ($where) $sql .= " WHERE $where";

            // ORDER
            if ($order && isset($order['col'])) {
                $col = preg_replace('/[^a-zA-Z0-9_.]/', '', $order['col']);
                $dir = ($order['asc'] ?? true) ? 'ASC' : 'DESC';
                $sql .= " ORDER BY `$col` $dir";
            }

            // LIMIT
            if ($limitN !== null) $sql .= " LIMIT " . (int)$limitN;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($bindings);

            if ($countOnly) {
                $row   = $stmt->fetch();
                $count = (int)($row['cnt'] ?? 0);
                jsonOut(['count' => $count, 'data' => null, 'error' => null]);
            }

            $rows = $stmt->fetchAll();

            // Post-proceso: descodificar JSON y reorganizar joins
            $rows = array_map(function ($row) use ($joinTable) {
                $row = decodeJsonCols($row);
                if ($joinTable) $row = flattenJoin($row, $joinTable);
                return $row;
            }, $rows);

            if ($singleRow) {
                $data = $rows[0] ?? null;
                jsonOut(['data' => $data, 'error' => null]);
            }

            jsonOut(['data' => $rows, 'error' => null]);
            break;
        }

        // ── INSERT ───────────────────────────────────────────
        case 'insert': {
            $data = $input['data'] ?? [];
            if (empty($data)) jsonOut(['error' => 'Sin datos para insertar']);

            // Si no tiene ID, generar uno
            if (!isset($data['id'])) {
                $data['id'] = bin2hex(random_bytes(16));
            }

            // Codificar arrays como JSON
            foreach ($data as $k => $v) {
                if (is_array($v)) $data[$k] = json_encode($v);
            }

            $cols     = array_keys($data);
            $safeCols = array_map(fn($c) => "`" . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . "`", $cols);
            $ph       = array_fill(0, count($cols), '?');

            $sql  = "INSERT INTO `$table` (" . implode(',', $safeCols) . ") VALUES (" . implode(',', $ph) . ")";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($data));

            jsonOut(['data' => ['id' => $data['id']], 'error' => null]);
            break;
        }

        // ── UPDATE ───────────────────────────────────────────
        case 'update': {
            $data = $input['data'] ?? [];
            if (empty($data)) jsonOut(['error' => 'Sin datos para actualizar']);
            if (empty($filters)) jsonOut(['error' => 'Update sin filtro no permitido']);

            foreach ($data as $k => $v) {
                if (is_array($v)) $data[$k] = json_encode($v);
            }

            $sets = [];
            $bindings = [];
            foreach ($data as $k => $v) {
                $safeK  = preg_replace('/[^a-zA-Z0-9_]/', '', $k);
                $sets[] = "`$safeK` = ?";
                $bindings[] = $v;
            }

            [$where, $wBindings] = buildWhere($filters);
            if ($where) {
                $sql = "UPDATE `$table` SET " . implode(', ', $sets) . " WHERE $where";
                $bindings = array_merge($bindings, $wBindings);
            } else {
                jsonOut(['error' => 'WHERE vacío en UPDATE']);
            }

            $pdo->prepare($sql)->execute($bindings);
            jsonOut(['data' => null, 'error' => null]);
            break;
        }

        // ── UPSERT ───────────────────────────────────────────
        case 'upsert': {
            $data = $input['data'] ?? [];
            if (empty($data)) jsonOut(['error' => 'Sin datos para upsert']);

            if (!isset($data['id'])) $data['id'] = bin2hex(random_bytes(16));

            foreach ($data as $k => $v) {
                if (is_array($v)) $data[$k] = json_encode($v);
            }

            $cols     = array_keys($data);
            $safeCols = array_map(fn($c) => "`" . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . "`", $cols);
            $ph       = array_fill(0, count($cols), '?');

            $updateParts = [];
            foreach ($cols as $c) {
                if ($c === 'id') continue;
                $safeC = preg_replace('/[^a-zA-Z0-9_]/', '', $c);
                $updateParts[] = "`$safeC` = VALUES(`$safeC`)";
            }

            $sql = "INSERT INTO `$table` (" . implode(',', $safeCols) . ") VALUES (" . implode(',', $ph) . ")"
                 . " ON DUPLICATE KEY UPDATE " . implode(', ', $updateParts);

            $pdo->prepare($sql)->execute(array_values($data));
            jsonOut(['data' => ['id' => $data['id']], 'error' => null]);
            break;
        }

        // ── DELETE ───────────────────────────────────────────
        case 'delete': {
            if (empty($filters)) jsonOut(['error' => 'Delete sin filtro no permitido']);
            [$where, $bindings] = buildWhere($filters);
            $pdo->prepare("DELETE FROM `$table` WHERE $where")->execute($bindings);
            jsonOut(['data' => null, 'error' => null]);
            break;
        }

        default:
            jsonOut(['error' => "Acción desconocida: $action"], 400);
    }

} catch (PDOException $e) {
    jsonOut(['error' => 'DB error: ' . $e->getMessage()], 500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWhere(array $filters): array {
    if (empty($filters)) return ['', []];
    $parts    = [];
    $bindings = [];
    foreach ($filters as $f) {
        $col  = preg_replace('/[^a-zA-Z0-9_.]/', '', $f['col'] ?? '');
        $type = $f['type'] ?? 'eq';

        if (strpos($col, '.') !== false) {
            [$t, $c] = explode('.', $col, 2);
            $colExpr = "`$t`.`$c`";
        } else {
            $colExpr = "`$col`";
        }

        if ($type === 'eq') {
            $parts[]    = "$colExpr = ?";
            $bindings[] = $f['val'];
        } elseif ($type === 'in') {
            $vals = $f['vals'] ?? [];
            if (empty($vals)) { $parts[] = '1=0'; continue; }
            $ph       = implode(',', array_fill(0, count($vals), '?'));
            $parts[]  = "$colExpr IN ($ph)";
            $bindings = array_merge($bindings, $vals);
        } elseif ($type === 'ilike') {
            $parts[]    = "$colExpr LIKE ?";
            $bindings[] = str_replace('%', '%', $f['pattern'] ?? '');
        }
    }
    return [implode(' AND ', $parts), $bindings];
}

function buildSelectCols(string $sel): string {
    if ($sel === '*' || $sel === '') return '*';
    $cols = array_map('trim', explode(',', $sel));
    $safe = [];
    foreach ($cols as $col) {
        if ($col === '*') { $safe[] = '*'; continue; }
        $col = preg_replace('/[^a-zA-Z0-9_.*]/', '', $col);
        $safe[] = "`$col`";
    }
    return implode(', ', $safe);
}

function decodeJsonCols(array $row): array {
    foreach ($row as $k => $v) {
        if (is_string($v) && (str_starts_with($v, '[') || str_starts_with($v, '{'))) {
            $decoded = json_decode($v, true);
            if (json_last_error() === JSON_ERROR_NONE) $row[$k] = $decoded;
        }
    }
    return $row;
}

function flattenJoin(array $row, string $joinTable): array {
    $nested = [];
    $flat   = [];
    $prefix = $joinTable . '__';
    foreach ($row as $k => $v) {
        if (str_starts_with($k, $prefix)) {
            $nested[substr($k, strlen($prefix))] = $v;
        } else {
            $flat[$k] = $v;
        }
    }
    if ($nested) $flat[$joinTable] = $nested;
    return $flat;
}