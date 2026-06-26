<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo — Panaderia Los Pumas</title>
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/index.css">
  <style>
    html,body { overflow-x: hidden; }

    .catalogo-header {
      background: linear-gradient(135deg, var(--marron) 0%, var(--marron-mid) 100%);
      padding: 28px 0 24px; color: white;
    }
    .catalogo-header h1 { color:white; font-size:1.6rem; margin-bottom:6px; }
    .catalogo-header p  { color:rgba(255,255,255,0.7); font-size:0.9rem; margin:0; }

    .catalogo-search-bar {
      background: var(--blanco); border-bottom: 1px solid var(--crema-dark);
      padding: 14px 0; position: sticky; top: 60px; z-index: 90;
    }
    .catalogo-search-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 24px;
      display: flex; gap: 12px; align-items: center;
    }
    .catalogo-search-inner .search-wrap { flex: 1; position: relative; }
    .catalogo-search-inner .search-wrap .ico {
      position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none;
    }
    .catalogo-search-inner input  { width:100%; padding-left:36px; margin:0; }
    .catalogo-search-inner select { width:auto; margin:0; font-size:0.88rem; padding:8px 12px; }

    .catalogo-layout {
      display: grid; grid-template-columns: 240px 1fr;
      gap: 24px; max-width: 1200px; margin: 0 auto;
      padding: 28px 24px 60px; align-items: start;
    }

    .sidebar-pan {
      background: var(--blanco); border-radius: var(--radio-lg);
      padding: 18px; box-shadow: var(--sombra);
      position: sticky; top: 130px;
    }
    .sidebar-pan h3 {
      font-family:'Playfair Display',serif; font-size:1rem;
      margin-bottom:12px; color:var(--marron);
    }
    .sidebar-pan .search-pan { position:relative; margin-bottom:12px; }
    .sidebar-pan .search-pan input { padding-left:32px; font-size:0.82rem; margin:0; }
    .sidebar-pan .search-pan .ico {
      position:absolute; left:10px; top:50%; transform:translateY(-50%);
      font-size:0.8rem; pointer-events:none; color:var(--gris);
    }
    .pan-chip {
      display:flex; align-items:center; gap:8px;
      padding:8px 10px; border-radius:var(--radio);
      cursor:pointer; text-decoration:none;
      color:var(--marron); font-size:0.85rem; font-weight:600;
      transition:background var(--trans); margin-bottom:4px;
    }
    .pan-chip:hover { background:var(--crema); }
    .pan-chip.on    { background:var(--crema-dark); }
    .pan-chip-avatar {
      width:30px; height:30px; border-radius:50%;
      background:var(--naranja); color:white;
      display:flex; align-items:center; justify-content:center;
      font-size:0.7rem; font-weight:700; flex-shrink:0;
    }

    .filtros-cat { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }

    .toolbar {
      display:flex; justify-content:space-between;
      align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;
    }
    .toolbar-count { font-size:0.88rem; color:var(--gris); }

    @media (max-width: 860px) {
      .catalogo-layout { grid-template-columns: 1fr; }
      .sidebar-pan { position:static; display:none; }
      .sidebar-pan.open { display:block; }
      .btn-toggle-sidebar { display:inline-flex !important; }
    }
    .btn-toggle-sidebar { display:none; }
    @media (max-width: 480px) {
      .catalogo-search-inner { flex-direction:column; }
      .catalogo-search-inner select { width:100%; }
    }
  </style>
</head>
<body>

  <nav class="navbar" role="navigation" aria-label="Navegación principal">
    <div class="navbar-inner">
      <a href="index.php" class="navbar-logo" aria-label="Inicio">
        <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'">
        Panaderia<span class="marca">PUMA</span>
      </a>
      <div class="navbar-actions">
        <a href="index.php" class="btn btn-ghost btn-sm">← Inicio</a>
        <a href="login.php" id="nav-btn" class="btn btn-ghost btn-sm">Ingresar</a>
        <a href="historial.php" id="nav-historial" class="btn btn-ghost btn-sm" style="display:none">
          Mis pedidos 📦
        </a>
        <button id="nav-logout" class="btn btn-ghost btn-sm" style="display:none" aria-label="Cerrar sesión">
          Salir 🚪
        </button>
        <button class="cart-btn" id="cart-toggle" aria-label="Abrir carrito">
          🛒 <span class="cart-badge">0</span>
        </button>
      </div>
    </div>
  </nav>

  <div class="catalogo-header">
    <div class="container">
      <h1>Catálogo de productos</h1>
      <p>Encontrá panes, facturas, tortas y más de panaderías artesanales de Catamarca</p>
    </div>
  </div>

  <div class="catalogo-search-bar">
    <div class="catalogo-search-inner">
      <button class="btn btn-ghost btn-sm btn-toggle-sidebar" id="btn-toggle-sidebar">
        🏪 Panaderías
      </button>
      <div class="search-wrap" role="search">
        <span class="ico" aria-hidden="true">🔍</span>
        <input type="search" id="search-catalogo"
               placeholder="Buscar productos..."
               aria-label="Buscar productos" autocomplete="off">
      </div>
      <select id="ordenar" aria-label="Ordenar productos">
        <option value="reciente">Más recientes</option>
        <option value="precio_asc">Menor precio</option>
        <option value="precio_desc">Mayor precio</option>
        <option value="nombre">A–Z</option>
        <option value="calificacion">Mejor calificados ⭐</option>
      </select>
    </div>
  </div>

  <div class="catalogo-layout">
    <aside class="sidebar-pan" id="sidebar-pan" aria-label="Panaderías">
      <h3>🏪 Panaderías</h3>
      <div class="search-pan">
        <span class="ico">🔍</span>
        <input type="search" id="search-panaderias"
               placeholder="Buscar panadería..." aria-label="Buscar panadería">
      </div>
      <div id="panaderias-list">
        <div class="skeleton" style="height:36px;border-radius:8px;margin-bottom:6px"></div>
        <div class="skeleton" style="height:36px;border-radius:8px;margin-bottom:6px"></div>
        <div class="skeleton" style="height:36px;border-radius:8px"></div>
      </div>
    </aside>

    <div>
      <div class="filtros-cat" role="group" aria-label="Filtrar por categoría">
        <button class="filtro on" data-cat="todos"    aria-pressed="true">Todos</button>
        <button class="filtro" data-cat="pan"         aria-pressed="false">🍞 Pan</button>
        <button class="filtro" data-cat="facturas"    aria-pressed="false">🥐 Facturas</button>
        <button class="filtro" data-cat="galletas"    aria-pressed="false">🍪 Galletas</button>
        <button class="filtro" data-cat="cakes"       aria-pressed="false">🎂 Cakes</button>
        <button class="filtro" data-cat="otro"        aria-pressed="false">✨ Otro</button>
      </div>

      <div class="toolbar">
        <span class="toolbar-count" id="count"></span>
      </div>

      <div id="productos-grid" class="grid-productos" aria-label="Productos disponibles"></div>

      <div id="empty-state" class="empty-state" style="display:none" aria-live="polite">
        <span class="ico">🔍</span>
        <h3>Sin resultados</h3>
        <p>Probá con otra búsqueda o categoría</p>
      </div>
    </div>
  </div>

  <div class="cart-overlay" id="cart-overlay" aria-hidden="true"></div>
  <aside class="cart-drawer" id="cart-drawer" aria-label="Carrito de compras">
    <div class="cart-header">
      <h3>Tu carrito 🛒</h3>
      <button class="cart-close" id="cart-close" aria-label="Cerrar carrito">✕</button>
    </div>
    <div id="cart-body"></div>
    <div id="cart-footer"></div>
  </aside>

  <footer style="text-align:center;padding:24px;font-size:0.8rem;color:var(--gris)">
    <a href="terminos.php" style="color:var(--gris)">Términos y Condiciones</a> ·
    <a href="privacidad.php" style="color:var(--gris)">Privacidad</a> ·
    <a href="nosotros.php" style="color:var(--gris)">Sobre nosotros</a>
  </footer>

  <div id="toast-box"></div>

  <script type="module">
    import { debounce, formatPrecio }         from './js/utils.js'
    import { actualizarBadge, renderCarrito } from './js/carrito.js'
    import { cargarProductos, renderProductos,
             setCat, setBusq }                from './js/productos.js'
    import { getUser, getPerfil, logout }     from './js/auth.js'
    import { initSugerencias }                from './js/sugerencias.js'

    actualizarBadge()
    cargarProductos()
    cargarPanaderias()

    // ── Nav usuario ──
    getUser().then(async user => {
      const btn     = document.getElementById('nav-btn')
      const logoutB = document.getElementById('nav-logout')
      const histBtn = document.getElementById('nav-historial')
      if (!user) {
        btn.href = 'login.php'; btn.textContent = 'Ingresar'
        if (logoutB) logoutB.style.display = 'none'
        if (histBtn) histBtn.style.display = 'none'
        return
      }
      const perfil = await getPerfil(user.id)
      if (perfil?.tipo === 'vendedor') {
        btn.href = 'vendedor.php'; btn.textContent = 'Mi panel 📊'
      } else if (perfil?.tipo === 'admin') {
        btn.href = 'admin.php'; btn.textContent = 'Admin ⚙️'
      } else {
        btn.href = '#'
        btn.textContent = `Hola, ${perfil?.nombre?.split(' ')[0]} 👋`
      }
      if (logoutB) logoutB.style.display = 'inline-flex'
      if (histBtn) histBtn.style.display = 'inline-flex'
    })

    document.getElementById('nav-logout')?.addEventListener('click', e => {
      e.preventDefault(); logout()
    })

    // ── Cargar panaderías en sidebar ──
    async function cargarPanaderias() {
      const res  = await fetch('api/profiles.php?action=listar_vendedores')
      const data = await res.json()
      const el   = document.getElementById('panaderias-list')

      if (!Array.isArray(data) || data.length === 0) {
        el.innerHTML = '<p style="font-size:0.82rem;color:var(--gris)">Sin panaderías aún</p>'
        return
      }

      el.innerHTML = `
        <a class="pan-chip on" data-id="todos" href="#">
          <div class="pan-chip-avatar" style="background:var(--marron)">🏪</div>
          Todas
        </a>
        ${data.map(p => `
          <a class="pan-chip" data-id="${p.id}"
             href="tienda.php?id=${p.id}"
             onclick="filtrarPorPanaderia(event, '${p.id}')">
            <div class="pan-chip-avatar"
                 style="${p.avatar_url
                   ? `background:url('${p.avatar_url}') center/cover;color:transparent`
                   : ''}">
              ${p.avatar_url ? '' : (p.nombre_panaderia || p.nombre || '?')[0].toUpperCase()}
            </div>
            ${p.nombre_panaderia || p.nombre}
          </a>
        `).join('')}
      `

      // Click en "Todas"
      el.querySelector('[data-id="todos"]').addEventListener('click', e => {
        e.preventDefault()
        el.querySelectorAll('.pan-chip').forEach(c => c.classList.remove('on'))
        e.currentTarget.classList.add('on')
        window._filtrarVendedor = null
        renderProductos()
      })
    }

    window.filtrarPorPanaderia = (e, id) => {
      e.preventDefault()
      const el = document.getElementById('panaderias-list')
      el.querySelectorAll('.pan-chip').forEach(c => c.classList.remove('on'))
      el.querySelector(`[data-id="${id}"]`)?.classList.add('on')
      window._filtrarVendedor = id
      renderProductos()
    }

    // ── Búsqueda con debounce ──
    const onBusq = debounce(v => setBusq(v), 250)
    document.getElementById('search-catalogo').addEventListener('input',
      e => onBusq(e.target.value))

    // ── Sugerencias de búsqueda ──
    initSugerencias('search-catalogo', async q => {
      const res  = await fetch(`api/productos.php?action=buscar&q=${encodeURIComponent(q)}&limit=6`)
      const data = await res.json()
      const emojis = { pan:'🍞', facturas:'🥐', galletas:'🍪', cakes:'🎂', otro:'✨' }
      return (Array.isArray(data) ? data : []).map(p => ({
        label:  p.nombre,
        sub:    p.categoria,
        ico:    emojis[p.categoria] || '🛒',
        href:   `producto.php?id=${p.id}`,
        precio: p.unidad_venta === 'kilo'
          ? `${formatPrecio(p.precio)}/kg` : formatPrecio(p.precio)
      }))
    })

    // ── Filtros categoría ──
    document.querySelectorAll('.filtro').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro').forEach(b => {
          b.classList.remove('on'); b.setAttribute('aria-pressed', 'false')
        })
        btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true')
        setCat(btn.dataset.cat)
      })
    })

    // ── Ordenar ──
    document.getElementById('ordenar').addEventListener('change', renderProductos)

    // ── Carrito ──
    function toggleCart(abrir) {
      document.getElementById('cart-drawer').classList.toggle('open', abrir)
      document.getElementById('cart-overlay').classList.toggle('open', abrir)
      if (abrir) renderCarrito()
    }
    document.getElementById('cart-toggle').addEventListener('click',  () => toggleCart(true))
    document.getElementById('cart-close').addEventListener('click',   () => toggleCart(false))
    document.getElementById('cart-overlay').addEventListener('click', () => toggleCart(false))

    // ── Toggle sidebar mobile ──
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar-pan').classList.toggle('open')
    })

    // ── Buscador panaderías en sidebar ──
    document.getElementById('search-panaderias').addEventListener('input',
      debounce(e => {
        const q = e.target.value.toLowerCase()
        document.querySelectorAll('#panaderias-list .pan-chip').forEach(chip => {
          chip.style.display = chip.textContent.toLowerCase().includes(q) ? 'flex' : 'none'
        })
      }, 200)
    )
  </script>

</body>
</html>