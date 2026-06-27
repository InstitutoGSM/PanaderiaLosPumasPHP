// ─── index.js ─────────────────────────────────────────────────────────────────
// Maneja index.php (landing page): stats, carrusel de productos, grid de panaderías
import { api, formatPrecio } from './utils.js';

(async function () {

  // ── Stats ─────────────────────────────────────────────────────────────────
  async function cargarStats() {
    const r = await api('api/admin.php?action=stats');
    if (!r.ok) return;
    const s = r.data;
    const sp = document.getElementById('stat-productos');
    const ss = document.getElementById('stat-panaderias');
    const sd = document.getElementById('stat-pedidos');
    if (sp) sp.textContent = s.productos  ?? 0;
    if (ss) ss.textContent = s.panaderias ?? 0;
    if (sd) sd.textContent = s.pedidos    ?? 0;
  }

  // ── Carrusel de productos destacados ──────────────────────────────────────
  let productos = [];
  let carruselIdx = 0;

  async function cargarCarrusel() {
    const r = await api('api/productos.php?action=listar&solo_activos=1');
    if (!r.ok || !r.data?.length) return;

    // Priorizar destacados
    const todos = r.data;
    const dest  = todos.filter(p => p.destacado);
    productos   = (dest.length >= 4 ? dest : todos).slice(0, 12);

    const track = document.getElementById('carrusel-track');
    if (!track) return;
    track.innerHTML = '';

    productos.forEach(p => {
      const card = document.createElement('a');
      card.href = `producto.php?id=${p.id}`;
      card.className = 'carrusel-card';
      card.innerHTML = `
        <img src="${p.imagen_url || 'assets/placeholder.png'}" alt="${p.nombre}" style="width:100%;height:180px;object-fit:cover" loading="lazy" onerror="this.style.display='none'">
        <div class="carrusel-body" style="padding:12px">
          <div style="font-size:.78rem;color:#888;margin-bottom:4px">${p.panaderia_nombre || ''}</div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:6px">${p.nombre}</div>
          <div style="font-weight:700;color:#C8601A">${formatPrecio(p.precio_unidad)}</div>
        </div>
      `;
      track.appendChild(card);
    });

    iniciarCarrusel();
  }

  function iniciarCarrusel() {
    const track = document.getElementById('carrusel-track');
    const dots  = document.getElementById('carrusel-dots');
    const prev  = document.getElementById('carr-prev');
    const next  = document.getElementById('carr-next');
    if (!track) return;

    const cards = track.querySelectorAll('.carrusel-card');
    const total = cards.length;
    if (!total) return;

    // Crear dots
    if (dots) {
      dots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('button');
        d.className = 'carrusel-dot';
        d.addEventListener('click', () => irA(i));
        dots.appendChild(d);
      }
    }

    function irA(idx) {
      carruselIdx = Math.max(0, Math.min(idx, total - 1));
      const cardW = cards[0].offsetWidth + 16; // gap
      track.style.transform = `translateX(-${carruselIdx * cardW}px)`;
      track.style.transition = 'transform .35s ease';
      if (dots) {
        dots.querySelectorAll('.carrusel-dot').forEach((d, i) => d.classList.toggle('active', i === carruselIdx));
      }
    }

    if (prev) prev.addEventListener('click', () => irA(carruselIdx - 1));
    if (next) next.addEventListener('click', () => irA(carruselIdx + 1));

    irA(0);

    // Auto-avance cada 5s
    let auto = setInterval(() => irA((carruselIdx + 1) % total), 5000);
    track.parentElement?.addEventListener('mouseenter', () => clearInterval(auto));
    track.parentElement?.addEventListener('mouseleave', () => { auto = setInterval(() => irA((carruselIdx + 1) % total), 5000); });
  }

  // ── Grid de panaderías ────────────────────────────────────────────────────
  async function cargarPanaderias() {
    const r = await api('api/panaderias.php?action=listar');
    const grid = document.getElementById('pans-grid');
    if (!r.ok || !grid) return;

    const pans = (r.data || []).slice(0, 6);
    if (!pans.length) { grid.innerHTML = '<p style="text-align:center;color:#888">Sin panaderías aún</p>'; return; }

    grid.innerHTML = pans.map(p => `
      <a href="tienda.php?id=${p.id}" style="display:block;text-decoration:none">
        <div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.07);display:flex;align-items:center;gap:14px;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,.13)'" onmouseout="this.style.boxShadow='0 2px 12px rgba(0,0,0,.07)'">
          <img src="${p.avatar_url || 'assets/placeholder.png'}" alt="${p.nombre}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='assets/placeholder.png'">
          <div>
            <div style="font-weight:700;color:#3B1A0A">${p.nombre}</div>
            <div style="font-size:.8rem;color:#888">${p.descripcion ? p.descripcion.slice(0, 60) + (p.descripcion.length > 60 ? '…' : '') : 'Ver productos →'}</div>
          </div>
        </div>
      </a>
    `).join('');
  }

  // ── Iniciar ───────────────────────────────────────────────────────────────
  await Promise.all([cargarStats(), cargarCarrusel(), cargarPanaderias()]);

})();
