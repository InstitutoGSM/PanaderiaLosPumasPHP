<?php
// Este archivo no es necesario — todas las operaciones de profiles van directo a api/query.php via el supabase.js
require_once __DIR__ . '/../config.php';
jsonOut(['ok' => true, 'info' => 'Usar api/query.php para profiles']);