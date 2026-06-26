<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panaderia Los Pumas — Panes artesanales de Catamarca</title>
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/index.css">
  <style>
    html, body { overflow-x: hidden; }

    /* ── Stats bar ── */
    .stats-bar {
      background: var(--marron); padding: 14px 0; color: white;
    }
    .stats-bar-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 24px;
      display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;
    }
    .stats-bar-item { text-align: center; }
    .stats-bar-num  { font-size: 1.5rem; font-weight: 900; font-family: 'Playfair Display', serif; }
    .stats-bar-lbl  { font-size: 0.72rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Carrusel panaderías ── */
    .sec-panaderias {
      padding: 36px 0 28px; background: var(--crema);
      border-bottom: 1px solid var(--crema-dark);
    }
    .sec-panaderias .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .sec-panaderias h2 { margin-bottom: 18px; }

    .pan-scroll-wrap { position: relative; }
    .pan-scroll {
      display: flex; gap: 14px; overflow-x: auto;
      scroll-snap-type: x mandatory; padding-bottom: 8px;
      scrollbar-width: none;
    }
    .pan-scroll::-webkit-scrollbar { display: none; }

    .pan-card {
      flex: 0 0 200px; background: var(--blanco);
      border-radius: var(--radio-lg); box-shadow: var(--sombra);
      text-decoration: none; color: var(--marron);
      scroll-snap-align: start; transition: transform var(--trans), box-shadow var(--trans);
      overflow: hidden;
    }
    .pan-card:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.13); }
    .pan-card-img {
      width: 100%; height: 110px; object-fit: cover;
      background: linear-gradient(135deg, var(--naranja) 0%, var(--marron-mid) 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem;
    }
    .pan-card-img img { width: 100%; height: 100%; object-fit: cover; }
    .pan-card-body { padding: 12px 14px; }
    .pan-card-nombre { font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;
                       white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pan-card-desc   { font-size: 0.75rem; color: var(--gris);
                       display: -webkit-box; -webkit-line-clamp: 2;
                       -webkit-box-orient: vertical; overflow: hidden; }
    .pan-card-footer {
      padding: 8px 14px 12px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .pan-card-prods { font-size: 0.72rem; color: var(--gris); }
    .pan-card-ver   { font-size: 0.72rem; color: var(--naranja); font-weight: 700; }

    .pan-scroll-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--blanco); box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      border: none; cursor: pointer; font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
      transition: background var(--trans); z-index: 2;
    }
    .pan-scroll-btn:hover { background: var(--crema-dark); }
    .pan-scroll-btn.prev { left: -14px; }
    .pan-scroll-btn.next { right: -14px; }
    @media (max-width: 600px) {
      .pan-scroll-btn { display: none; }
    }

    /* ── Sección populares ── */
    .sec-populares { padding: 32px 0 0; }
    .sec-populares .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .populares-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px; margin-bottom: 20px;
    }
    .pop-card {
      background: var(--blanco); border-radius: var(--radio-lg);
      box-shadow: var(--sombra); overflow: hidden;
      text-decoration: none; color: var(--marron);
      transition: transform var(--trans);
    }
    .pop-card:hover { transform: translateY(-3px); }
    .pop-card-img {
      width: 100%; height: 90px; object-fit: cover;
      background: var(--crema-dark); display: flex;
      align-items: center; justify-content: center; font-size: 2rem;
    }
    .pop-card-img img { width: 100%; height: 100%; object-fit: cover; }
    .pop-card-body { padding: 10px 12px; }
    .pop-card-nombre { font-weight: 700; font-size: 0.82rem; margin-bottom: 2px;
                       white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pop-card-precio { font-size: 0.8rem; color: var(--naranja); font-weight: 700; }
    .pop-card-pan    { font-size: 0.7rem; color: var(--gris); margin-top: 1px; }

    /* ── Separador secciones ── */
    .sec-titulo-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
    }
    .sec-titulo-row h2 { margin: 0; }
    .sec-titulo-row a  { font-size: 0.82rem; color: var(--naranja); font-weight: 700; }

    /* ── Banner registro vendedor ── */
    .banner-vendedor {
      background: linear-gradient(135deg, var(--marron) 0%, #5C3D2E 100%);
      border-radius: var(--radio-lg); padding: 28px 32px;
      display: flex; align-items: center; gap: 24px;
      margin: 32px 0; flex-wrap: wrap; color: white;
    }
    .banner-vendedor-ico { font-size: 3rem; flex-shrink: 0; }
    .banner-vendedor-txt { flex: 1; }
    .banner-vendedor-txt h3 { color: white; margin-bottom: 4px; font-size: 1.2rem; }
    .banner-vendedor-txt p  { opacity: 0.8; font-size: 0.88rem; margin: 0; }
    @media (max-width: 500px) { .banner-vendedor { flex-direction: column; text-align: center; } }
  </style>
</head>
<body>

  <!-- NAVBAR -->
  <nav class="navbar" role="navigation" aria-label="Navegación principal">
    <div class="navbar-inner">
      <a href="index.php" class="navbar-logo" aria-label="Inicio">
        <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'">
        Panaderia<span class="marca">PUMA</span>
      </a>
      <div class="navbar-search" role="search">
        <span class="ico" aria-hidden="true">🔍</span>
        <input type="search" id="search-nav"
               placeholder="Buscar panes, panaderías..."
               aria-label="Buscar productos" autocomplete="off">
      </div>
      <div class="navbar-actions">
        <a href="catalogo.php" class="btn btn-ghost btn-sm">Catálogo</a>
        <a href="login.php" id="nav-btn" class="btn btn-ghost btn-sm">Ingresar</a>
        <a href="historial.php" id="nav-historial"
           class="btn btn-ghost btn-sm" style="display:none">
          Mis pedidos 📦
        </a>
        <button id="nav-logout" class="btn btn-ghost btn-sm"
                style="display:none" aria-label="Cerrar sesión">
          Salir 🚪
        </button>
        <button class="cart-btn" id="cart-toggle" aria-label="Abrir carrito">
          🛒 <span class="cart-badge">0</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero" aria-label="Bienvenida">
    <div class="container">
      <div class="hero-inner">
        <div class="hero-texto">
          <h1>El antojo que<br>estabas buscando 🥐</h1>
          <p>Comprá directo a panaderías artesanales.<br>
             Todo hecho con amor y bajo pedido.</p>
        </div>
        <div class="hero-search-wrap">
          <div class="hero-search">
            <input type="search" id="search-hero"
                   placeholder="¿Qué se te antoja hoy?"
                   aria-label="Buscar productos" autocomplete="off">
            <button class="btn btn-naranja" id="btn-buscar">Buscar</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- STATS BAR -->
  <div class="stats-bar" id="stats-bar" style="display:none">
    <div class="stats-bar-inner">
      <div class="stats-bar-item">
        <div class="stats-bar-num" id="stat-panaderias">—</div>
        <div class="stats-bar-lbl">Panaderías</div>
      </div>
      <div class="stats-bar-item">
        <div class="stats-bar-num" id="stat-productos">—</div>
        <div class="stats-bar-lbl">Productos</div>
      </div>
      <div class="stats-bar-item">
        <div class="stats-bar-num" id="stat-pedidos">—</div>
        <div class="stats-bar-lbl">Pedidos entregados</div>
      </div>
    </div>
  </div>

  <!-- CARRUSEL PANADERÍAS -->
  <section class="sec-panaderias" id="sec-panaderias" style="display:none">
    <div class="container">
      <div class="sec-titulo-row">
        <h2 class="sec-titulo">🏪 Panaderías disponibles</h2>
        <a href="catalogo.php">Ver catálogo completo →</a>
      </div>
      <div class="pan-scroll-wrap">
        <button class="pan-scroll-btn prev" id="pan-prev" aria-label="Anterior">‹</button>
        <div class="pan-scroll" id="pan-scroll">
          <div class="skeleton" style="flex:0 0 200px;height:190px;border-radius:var(--radio-lg)"></div>
          <div class="skeleton" style="flex:0 0 200px;height:190px;border-radius:var(--radio-lg)"></div>
          <div class="skeleton" style="flex:0 0 200px;height:190px;border-radius:var(--radio-lg)"></div>
        </div>
        <button class="pan-scroll-btn next" id="pan-next" aria-label="Siguiente">›</button>
      </div>
    </div>
  </section>

  <!-- MAIN -->
  <main>
    <div class="container" style="max-width:1200px;margin:0 auto;padding:0 24px">

      <!-- PRODUCTOS POPULARES -->
      <section class="sec-populares" id="sec-populares" style="display:none">
        <div class="sec-titulo-row">
          <h2 class="sec-titulo">⭐ Más populares</h2>
          <a href="catalogo.php">Ver todos →</a>
        </div>
        <div class="populares-grid" id="populares-grid"></div>
      </section>

      <!-- BANNER VENDEDOR -->
      <div class="banner-vendedor" id="banner-vendedor">
        <div class="banner-vendedor-ico">🥖</div>
        <div class="banner-vendedor-txt">
          <h3>¿Tenés una panadería?</h3>
          <p>Sumate a la red de panaderías artesanales de Catamarca y empezá a vender online hoy.</p>
        </div>
        <a href="login.php" class="btn btn-naranja">Registrarme →</a>
      </div>

      <!-- TODOS LOS PRODUCTOS -->
      <div class="sec-titulo-row" style="margin-top:12px">
        <h2 class="sec-titulo">🛒 Todos los productos</h2>
      </div>

      <!-- Filtros -->
      <div class="filtros sec-sm" role="group" aria-label="Filtrar por categoría">
        <button class="filtro on" data-cat="todos"    aria-pressed="true">Todos</button>
        <button class="filtro" data-cat="pan"         aria-pressed="false">🍞 Pan</button>
        <button class="filtro" data-cat="facturas"    aria-pressed="false">🥐 Facturas</button>
        <button class="filtro" data-cat="galletas"    aria-pressed="false">🍪 Galletas</button>
        <button class="filtro" data-cat="cakes"       aria-pressed="false">🎂 Cakes</button>
        <button class="filtro" data-cat="otro"        aria-pressed="false">✨ Otro</button>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <span class="toolbar-count" id="count"></span>
        <select id="ordenar" aria-label="Ordenar productos">
          <option value="reciente">Más recientes</option>
          <option value="precio_asc">Menor precio</option>
          <option value="precio_desc">Mayor precio</option>
          <option value="nombre">A–Z</option>
          <option value="calificacion">Mejor calificados ⭐</option>
        </select>
      </div>

      <!-- Grid principal -->
      <div id="productos-grid" class="grid-productos sec-sm"
           role="list" aria-label="Productos disponibles"></div>

      <div id="empty-state" class="empty-state" style="display:none" aria-live="polite">
        <span class="ico">🔍</span>
        <h3>Sin resultados</h3>
        <p>Probá con otra búsqueda o categoría</p>
      </div>

      <div style="text-align:center;padding:28px 0 16px;font-size:0.82rem;color:var(--gris)">
        <a href="terminos.php"   style="color:var(--gris)">Términos</a> ·
        <a href="privacidad.php" style="color:var(--gris)">Privacidad</a> ·
        <a href="nosotros.php"   style="color:var(--gris)">Sobre nosotros</a> ·
        © <?= date('Y') ?> Panaderia Los Pumas
      </div>

    </div>
  </main>

  <!-- CARRITO -->
  <div class="cart-overlay" id="cart-overlay" aria-hidden="true"></div>
  <aside class="cart-drawer" id="cart-drawer" aria-label="Carrito de compras">
    <div class="cart-header">
      <h3>Tu carrito 🛒</h3>
      <button class="cart-close" id="cart-close" aria-label="Cerrar carrito">✕</button>
    </div>
    <div id="cart-body"></div>
    <div id="cart-footer"></div>
  </aside>

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
    cargarSeccionesExtra()

    // ── Nav usuario ──
    getUser().then(async user => {
      const btn     = document.getElementById('nav-btn')
      const logoutB = document.getElementById('nav-logout')
      const histBtn = document.getElementById('nav-historial')
      const banner  = document.getElementById('banner-vendedor')

      if (!user) {
        btn.href = 'login.php'; btn.textContent = 'Ingresar'
        if (logoutB) logoutB.style.display = 'none'
        if (histBtn) histBtn.style.display = 'none'
        return
      }

      const perfil = await getPerfil(user.id)
      if (perfil?.tipo === 'vendedor') {
        btn.href = 'vendedor.php'; btn.textContent = 'Mi panel 📊'
        if (banner) banner.style.display = 'none'
      } else if (perfil?.tipo === 'admin') {
        btn.href = 'admin.php'; btn.textContent = 'Admin ⚙️'
        if (banner) banner.style.display = 'none'
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

    // ── Secciones extra (stats + carrusel + populares) ──
    async function cargarSeccionesExtra() {
      const [resPan, resProd, resPed] = await Promise.all([
        fetch('api/profiles.php?action=listar_vendedores'),
        fetch('api/productos.php?action=todos'),
        fetch('api/pedidos.php?action=conteo_entregados'),
      ])

      const panaderias = await resPan.json()
      const productos  = await resProd.json()
      let   pedidos    = 0
      try { const d = await resPed.json(); pedidos = d.total || 0 } catch(e) {}

      // Stats bar
      if (Array.isArray(panaderias) && panaderias.length > 0) {
        document.getElementById('stats-bar').style.display = 'block'
        document.getElementById('stat-panaderias').textContent = panaderias.length
        document.getElementById('stat-productos').textContent  =
          Array.isArray(productos) ? productos.length : 0
        document.getElementById('stat-pedidos').textContent    = pedidos
      }

      // Carrusel panaderías
      if (Array.isArray(panaderias) && panaderias.length > 0) {
        document.getElementById('sec-panaderias').style.display = 'block'
        renderCarrusel(panaderias, productos)
      }

      // Populares (hasta 6 con más calificación o los primeros)
      if (Array.isArray(productos) && productos.length > 0) {
        document.getElementById('sec-populares').style.display = 'block'
        const populares = [...productos]
          .sort((a, b) => parseFloat(b.calificacion_promedio || 0) - parseFloat(a.calificacion_promedio || 0))
          .slice(0, 6)
        renderPopulares(populares)
      }
    }

    function renderCarrusel(panaderias, productos) {
      const scroll = document.getElementById('pan-scroll')
      const emojis = ['🥐','🍞','🧁','🥖','🍰','🧇']

      scroll.innerHTML = panaderias.map((p, i) => {
        const cantProds = Array.isArray(productos)
          ? productos.filter(pr => pr.vendedor_id === p.id).length : 0
        return `
          <a class="pan-card" href="tienda.php?id=${p.id}">
            <div class="pan-card-img">
              ${p.avatar_url
                ? `<img src="${p.avatar_url}" alt="${p.nombre_panaderia || p.nombre}">`
                : emojis[i % emojis.length]}
            </div>
            <div class="pan-card-body">
              <div class="pan-card-nombre">${p.nombre_panaderia || p.nombre}</div>
              <div class="pan-card-desc">${p.descripcion || 'Panadería artesanal de Catamarca'}</div>
            </div>
            <div class="pan-card-footer">
              <span class="pan-card-prods">${cantProds} producto${cantProds !== 1 ? 's' : ''}</span>
              <span class="pan-card-ver">Ver →</span>
            </div>
          </a>
        `
      }).join('')

      // Botones scroll
      document.getElementById('pan-prev').addEventListener('click', () => {
        scroll.scrollBy({ left: -220, behavior: 'smooth' })
      })
      document.getElementById('pan-next').addEventListener('click', () => {
        scroll.scrollBy({ left: 220, behavior: 'smooth' })
      })
    }

    function renderPopulares(productos) {
      const grid   = document.getElementById('populares-grid')
      const emojis = { pan:'🍞', facturas:'🥐', galletas:'🍪', cakes:'🎂', otro:'✨' }
      grid.innerHTML = productos.map(p => `
        <a class="pop-card" href="producto.php?id=${p.id}">
          <div class="pop-card-img">
            ${p.imagen_url
              ? `<img src="${p.imagen_url}" alt="${p.nombre}">`
              : emojis[p.categoria] || '🛒'}
          </div>
          <div class="pop-card-body">
            <div class="pop-card-nombre">${p.nombre}</div>
            <div class="pop-card-precio">
              ${formatPrecio(p.precio)}${p.unidad_venta === 'kilo' ? '/kg' : ''}
            </div>
            <div class="pop-card-pan">${p.nombre_panaderia || ''}</div>
          </div>
        </a>
      `).join('')
    }

    // ── Sugerencias ──
    async function buscarSugerencias(q) {
      const ql   = q.toLowerCase()
      const sugs = []
      const emojis = { pan:'🍞', facturas:'🥐', galletas:'🍪', cakes:'🎂', otro:'✨' }

      const [resProd, resPan] = await Promise.all([
        fetch(`api/productos.php?action=buscar&q=${encodeURIComponent(q)}&limit=5`),
        fetch('api/profiles.php?action=listar_vendedores'),
      ])
      const prods = await resProd.json()
      const pans  = await resPan.json()

      ;(Array.isArray(pans) ? pans : [])
        .filter(p => (p.nombre_panaderia || p.nombre || '').toLowerCase().includes(ql))
        .slice(0, 2)
        .forEach(p => sugs.push({
          label: p.nombre_panaderia || p.nombre,
          sub: 'Panadería',
          ico: '🏪',
          href: `tienda.php?id=${p.id}`
        }))

      ;(Array.isArray(prods) ? prods : [])
        .forEach(p => sugs.push({
          label:  p.nombre, sub: p.categoria,
          ico:    emojis[p.categoria] || '🛒',
          href:   `producto.php?id=${p.id}`,
          precio: p.unidad_venta === 'kilo'
            ? `${formatPrecio(p.precio)}/kg` : formatPrecio(p.precio)
        }))

      return sugs
    }

    initSugerencias('search-nav',  buscarSugerencias)
    initSugerencias('search-hero', buscarSugerencias)

    // ── Búsqueda ──
    const onBusq = debounce(v => setBusq(v), 250)
    document.getElementById('search-nav').addEventListener('input',
      e => onBusq(e.target.value))
    document.getElementById('search-hero').addEventListener('input', e => {
      onBusq(e.target.value)
      document.getElementById('search-nav').value = e.target.value
    })
    document.getElementById('btn-buscar').addEventListener('click', () => {
      setBusq(document.getElementById('search-hero').value)
      document.querySelector('main').scrollIntoView({ behavior: 'smooth' })
    })

    // ── Filtros ──
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
  </script>

</body>
</html>