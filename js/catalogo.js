// ─── catalogo.js ──────────────────────────────────────────────────────────────
// Maneja catalogo.php: grid de productos, filtros, sidebar de panaderías, carrito
import { api, toast, formatPrecio, getParam, $ } from './utils.js';
import { getSession, initNav, logout } from './auth.js';
import { initCarritoUI, agregarItem } from './carrito.js';

(async function () {

  const u = await getSession();
  initNav(u);
  initCarritoUI();

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const grid       = document.getElementById('productos-grid');
  const emptyState = document.getElementById('empty-state');
  const searchEl   = document.getElementById('search-catalogo');
  const ordenEl    = document.getElementById('ordenar');
  const countEl    = document.getElementById('count');
  const panList    = document.getElementById('panaderias-list');
  const searchPan  = document.getElementById('search-panaderias');
  const sidebar    = document.getElementById('sidebar-pan');
  const btnToggle  = document.getElementById('btn-toggle-sidebar');

  // ── Estado ────────────────────────────────────────────────────────────────
  let todos        = [];
  let panaderias   = [];
  let catActiva    = 'todos';
  let panActiva    = null;
  let buscar       = getParam('buscar') || '';
  let orden        = 'nombre';

  // Filtro de categoría desde URL
  if (searchEl && buscar) searchEl.value = buscar;

  // Sidebar toggle
  if (btnToggle && sidebar) {
    btnToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const [rProds, rPans] = await Promise.all([
    api('api/productos.php?action=listar&solo_activos=1'),
    api('api/panaderias.php?action=listar')
  ]);

  todos      = rProds.ok ? (rProds.data || []) : [];
  panaderias = rPans.ok  ? (rPans.data  || []) : [];

  renderPanaderias();
  renderFiltros();
  aplicar();

  // ── Sidebar de panaderías ─────────────────────────────────────────────────
  function renderPanaderias() {
    if (!panList) return;
    panList.innerHTML = '';
    const todas = mkPanItem('Todas las panaderías', null);
    panList.appendChild(todas);

    let pansFiltradas = panaderias;
    const q = searchPan?.value.trim().toLowerCase();
    if (q) pansFiltradas = pansFiltradas.filter(p => p.nombre.toLowerCase().includes(q));

    pansFiltradas.forEach(p => panList.appendChild(mkPanItem(p.nombre, p.id)));
  }

  function mkPanItem(nombre, id) {
    const li = document.createElement('a');
    li.href = '#';
    li.textContent = nombre;
    li.style.cssText = 'display:block;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:.9rem;color:#3B1A0A;transition:background .15s';
    if (panActiva === id) li.style.background = '#f5efe5';
    li.addEventListener('click', e => {
      e.preventDefault();
      panActiva = id;
      renderPanaderias();
      aplicar();
    });
    return li;
  }

  if (searchPan) searchPan.addEventListener('input', renderPanaderias);

  // ── Filtros de categoría (data-cat buttons) ───────────────────────────────
  function renderFiltros() {
    document.querySelectorAll('.filtro[data-cat]').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.cat === catActiva);
      btn.addEventListener('click', () => {
        catActiva = btn.dataset.cat;
        document.querySelectorAll('.filtro[data-cat]').forEach(b => b.classList.toggle('on', b.dataset.cat === catActiva));
        aplicar();
      });
    });
  }

  // ── Búsqueda y orden ──────────────────────────────────────────────────────
  if (searchEl) searchEl.addEventListener('input', () => { buscar = searchEl.value.trim(); aplicar(); });
  if (ordenEl)  ordenEl.addEventListener('change', () => { orden = ordenEl.value; aplicar(); });

  // ── Aplicar filtros ───────────────────────────────────────────────────────
  function aplicar() {
    let lista = [...todos];

    if (catActiva && catActiva !== 'todos')
      lista = lista.filter(p => (p.categoria || '').toLowerCase() === catActiva);

    if (panActiva)
      lista = lista.filter(p => p.panaderia_id === panActiva);

    if (buscar) {
      const q = buscar.toLowerCase();
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.panaderia_nombre || '').toLowerCase().includes(q)
      );
    }

    lista.sort((a, b) => {
      if (orden === 'precio_asc')  return a.precio_unidad - b.precio_unidad;
      if (orden === 'precio_desc') return b.precio_unidad - a.precio_unidad;
      return a.nombre.localeCompare(b.nombre);
    });

    if (countEl) countEl.textContent = lista.length + ' producto' + (lista.length !== 1 ? 's' : '');
    renderGrid(lista);
  }

  // ── Render grid ───────────────────────────────────────────────────────────
  function renderGrid(lista) {
    if (!grid) return;
    grid.innerHTML = '';

    const empty = !lista.length;
    if (emptyState) emptyState.style.display = empty ? '' : 'none';
    if (empty) return;

    lista.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card-producto';
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <a href="producto.php?id=${p.id}" style="display:block;text-decoration:none;color:inherit">
          <div style="aspect-ratio:4/3;overflow:hidden;border-radius:10px 10px 0 0;background:#f5efe5">
            ${p.imagen_url
              ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem">🍞</div>`}
          </div>
          <div style="padding:12px 12px 6px">
            ${p.panaderia_nombre ? `<div style="font-size:.75rem;color:#888;margin-bottom:2px">${p.panaderia_nombre}</div>` : ''}
            <div style="font-weight:700;font-size:.95rem;margin-bottom:4px">${p.nombre}</div>
            <div style="font-weight:700;color:#C8601A;font-size:1rem">${formatPrecio(p.precio_unidad)}</div>
            ${p.precio_docena ? `<div style="font-size:.8rem;color:#888">Docena: ${formatPrecio(p.precio_docena)}</div>` : ''}
            ${p.destacado ? `<span style="font-size:.7rem;background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:999px;font-weight:700">⭐ Destacado</span>` : ''}
          </div>
        </a>
        <div style="padding:0 12px 12px">
          <button class="btn-agregar" style="width:100%;padding:9px;background:#C8601A;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.9rem">
            Agregar al carrito
          </button>
        </div>
      `;
      card.querySelector('.btn-agregar').addEventListener('click', () => {
        const ok = agregarItem({ producto_id: p.id, nombre: p.nombre, precio_unit: p.precio_unidad, tipo_precio: 'unidad', cantidad: 1, panaderia_id: p.panaderia_id });
        if (ok) toast(p.nombre + ' agregado al carrito 🛒', 'ok');
      });
      grid.appendChild(card);
    });
  }

})();
