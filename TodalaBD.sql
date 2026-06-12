-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:1107
-- Tiempo de generación: 12-06-2026 a las 20:09:22
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `panaderia`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calificaciones`
--

CREATE TABLE `calificaciones` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `producto_id` varchar(36) DEFAULT NULL,
  `comprador_id` varchar(36) DEFAULT NULL,
  `estrellas` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `calificaciones`
--

INSERT INTO `calificaciones` (`id`, `producto_id`, `comprador_id`, `estrellas`, `created_at`) VALUES
('66b4011e69687da8683be3c542d102ea', 'd7bc10e7fa763ead5742677f012d9ae2', '04e6b2a1def5160b6d45ca8bc5fc097b', 5, '2026-06-09 18:47:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carrito`
--

CREATE TABLE `carrito` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `user_id` varchar(36) DEFAULT NULL,
  `producto_id` varchar(36) DEFAULT NULL,
  `cantidad` int(11) DEFAULT 1,
  `variante` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `comprador_id` varchar(36) DEFAULT NULL,
  `vendedor_id` varchar(36) DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `total` decimal(10,2) NOT NULL,
  `estado` text DEFAULT 'pendiente',
  `direccion` text DEFAULT NULL,
  `codigo_postal` text DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `medio_pago` text DEFAULT NULL,
  `nombre_comprador` text DEFAULT NULL,
  `email_comprador` text DEFAULT NULL,
  `ticket_id` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id`, `comprador_id`, `vendedor_id`, `items`, `total`, `estado`, `direccion`, `codigo_postal`, `notas`, `medio_pago`, `nombre_comprador`, `email_comprador`, `ticket_id`, `created_at`) VALUES
('43c603cc2bbfccd01ac6e6e597743d40', '04e6b2a1def5160b6d45ca8bc5fc097b', '96b0f339f3cf5766c1a9a9be97d0c42f', '[{\"nombre\":\"Pan frances\",\"cantidad\":1,\"precio\":\"1000.00\",\"variante\":\"unidad\"}]', 1000.00, 'pendiente', 'dadd', '4709', 'sin migajas', 'efectivo', 'Aparicio Leandro', 'leandroaparicio@gmail.com', 'TK-97743D40-6CAD', '2026-06-09 18:46:14');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `vendedor_id` varchar(36) DEFAULT NULL,
  `nombre` text NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `precio_docena` decimal(10,2) DEFAULT NULL,
  `precio_media_docena` decimal(10,2) DEFAULT NULL,
  `categoria` text DEFAULT NULL,
  `imagen_url` text DEFAULT NULL,
  `cantidad_disponible` int(11) DEFAULT 0,
  `dato_extra` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `unidad_venta` text DEFAULT 'unidad',
  `slug` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `vendedor_id`, `nombre`, `descripcion`, `precio`, `precio_docena`, `precio_media_docena`, `categoria`, `imagen_url`, `cantidad_disponible`, `dato_extra`, `activo`, `unidad_venta`, `slug`, `created_at`) VALUES
('d7bc10e7fa763ead5742677f012d9ae2', '96b0f339f3cf5766c1a9a9be97d0c42f', 'Pan frances', 'Pan hecho por un frances', 1000.00, NULL, NULL, 'pan', 'assets/productos/96b0f339f3cf5766c1a9a9be97d0c42f_1780685484.png', 89998, 'el pan fue amasado por un frances', 1, 'kilo', NULL, '2026-06-05 15:51:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_fotos`
--

CREATE TABLE `producto_fotos` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `producto_id` varchar(36) DEFAULT NULL,
  `url` text NOT NULL,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profiles`
--

CREATE TABLE `profiles` (
  `id` varchar(36) NOT NULL,
  `nombre` text NOT NULL,
  `tipo` text DEFAULT 'comprador',
  `nombre_panaderia` text DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `instagram` text DEFAULT NULL,
  `telefono` text DEFAULT NULL,
  `email_contacto` text DEFAULT NULL,
  `banner_anuncio` text DEFAULT NULL,
  `es_nuevo_vendedor` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `cbu` text DEFAULT NULL,
  `alias_cbu` text DEFAULT NULL,
  `titular_cuenta` text DEFAULT NULL,
  `medios_pago` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`medios_pago`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `profiles`
--

INSERT INTO `profiles` (`id`, `nombre`, `tipo`, `nombre_panaderia`, `descripcion`, `avatar_url`, `instagram`, `telefono`, `email_contacto`, `banner_anuncio`, `es_nuevo_vendedor`, `created_at`, `cbu`, `alias_cbu`, `titular_cuenta`, `medios_pago`) VALUES
('04e6b2a1def5160b6d45ca8bc5fc097b', 'Aparicio Leandro', 'comprador', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-06-05 15:46:41', NULL, NULL, NULL, NULL),
('96b0f339f3cf5766c1a9a9be97d0c42f', 'Elizondo Cesar', 'vendedor', 'Los Pumas', 'Somos la panaderia Central!', 'assets/avatares/96b0f339f3cf5766c1a9a9be97d0c42f_1781041479.png', 'sin_instagram', '3834533344', 'panaderialospumas@gmail.com', 'Descuento del 10% en migajas', 1, '2026-06-05 15:48:26', '1234567891011121314151', 'panaderia.puma', 'Elizondo Cesar', '[\"efectivo\",\"transferencia\"]');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tarjetas`
--

CREATE TABLE `tarjetas` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `user_id` varchar(36) DEFAULT NULL,
  `numero_enmascarado` text NOT NULL,
  `ultimos_4` text NOT NULL,
  `tipo` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `email` varchar(255) NOT NULL,
  `password` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `email`, `password`, `created_at`) VALUES
('04e6b2a1def5160b6d45ca8bc5fc097b', 'leandroaparicio@gmail.com', '$2y$10$wJvFbl2B2xYLfaWUiprUduKy6NfbX1wdPd8dYFbRDoxc2RW4u8SIe', '2026-06-05 15:46:41'),
('96b0f339f3cf5766c1a9a9be97d0c42f', 'lospumas@gmail.com', '$2y$10$d9xI6Zwbm0vjRciW9JoDVuyKrJbx1Qt58uYpdyAPcY4UFNeA9Pab6', '2026-06-05 15:48:26');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `calificaciones`
--
ALTER TABLE `calificaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cal` (`producto_id`,`comprador_id`);

--
-- Indices de la tabla `carrito`
--
ALTER TABLE `carrito`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `producto_fotos`
--
ALTER TABLE `producto_fotos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `tarjetas`
--
ALTER TABLE `tarjetas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
