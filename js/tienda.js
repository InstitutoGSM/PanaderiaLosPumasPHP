// ─── tienda.js ────────────────────────────────────────────────────────────────
// Maneja tienda.php: tienda individual de una panadería
import { api, toast, formatPrecio, getParam } from './utils.js';
import { getSession, initNav } from './auth.js';
import { initCarritoUI, agregarItem } from './carrito.js';

(async function () {

  const panaderiaId = getParam('id');
  if (!panaderiaId) { window.location.href = 'catalogo.php'; return; }

  const u = await getSession();
  initNav(u);
  initCarritoUI();

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const headerWrap = document.getElementById('tienda-header-wrap');
  const tiendaInfo = document.getElementById('tienda-info');
  const filtrosCont = document.getElementById('filtros-tienda');
  const gridTienda  = document.getElementById('grid-tienda');
  const emptyTienda = document.getElementById('empty-tienda');
  const countTienda = document.getElementById('count-tienda');
  const searchTienda = document.getElementById('search-tienda');

  let todos       = [];
  let catActiva   = 'todos';
  let buscar      = '';

  // ── Cargar panadería y productos ──────────────────────────────────────────
  const [rPan, rProds] = await Promise.all([
    api(`api/panaderias.php?action=detalle&id=${panaderiaId}`),
    api(`api/productos.php?action=listar&panaderia_id=${panaderiaId}&solo_activos=1`)
  ]);

  if (!rPan.ok || !rPan.data) {
    toast('Panadería no encontrada', 'error');
    setTimeout(() => { window.location.href = 'catalogo.php'; }, 1500);
    return;
  }

  const pan = rPan.data;
  todos = rProds.ok ? (rProds.data || []) : [];

  document.title = pan.nombre + ' — PanaderiaMarket';
  renderHeader(pan);
  renderFiltros();
  aplicar();

  if (searchTienda) searchTienda.addEventListener('input', () => { buscar = searchTienda.value.trim(); aplicar(); });

  // ── Header de la tienda ───────────────────────────────────────────────────
  function renderHeader(pan) {
    // Banner
    if (headerWrap && pan.banner_url) {
      headerWrap.style.backgroundImage = `url(${pan.banner_url})`;
      headerWrap.style.backgroundSize = 'cover';
      headerWrap.style.backgroundPosition = 'center';
    }

    if (!tiendaInfo) return;
    const medios = [];
    if (pan.acepta_efectivo)      medios.push('Efectivo');
    if (pan.acepta_transferencia) medios.push('Transferencia');
    if (pan.acepta_tarjeta)       medios.push('Tarjeta');

    tiendaInfo.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        ${pan.avatar_url
          ? `<img src="${pan.avatar_url}" alt="${pan.nombre}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)">`
          : `<div style="width:70px;height:70px;border-radius:50%;background:#C8601A;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.8rem;border:3px solid #fff">🍞</div>`}
        <div>
          <h1 style="margin:0;font-size:1.5rem;font-weight:800">${pan.nombre}</h1>
          ${pan.descripcion ? `<p style="margin:4px 0 0;font-size:.9rem;opacity:.85">${pan.descripcion}</p>` : ''}
          <div style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;font-size:.82rem;opacity:.8">
            ${pan.telefono ? `<span>📞 ${pan.telefono}</span>` : ''}
            ${pan.instagram ? `<a href="https://instagram.com/${pan.instagram.replace('@','')}" target="_blank" style="color:inherit">@${pan.instagram}</a>` : ''}
            ${medios.length ? `<span>💳 ${medios.join(' · ')}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ── Filtros de categoría ──────────────────────────────────────────────────
  function renderFiltros() {
    if (!filtrosCont) return;
    // Obtener categorías únicas de los productos
    const cats = [...new Set(todos.map(p => p.categoria).filter(Boolean))];

    filtrosCont.innerHTML = '';
    const mkBtn = (label, cat) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = 'filtro' + (catActiva === cat ? ' on' : '');
      b.style.cssText = 'padding:6px 14px;border-radius:999px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:.85rem;transition:all .15s';
      b.addEventListener('click', () => {
        catActiva = cat;
        filtrosCont.querySelectorAll('.filtro').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        aplicar();
      });
      return b;
    };

    filtrosCont.appendChild(mkBtn('Todos', 'todos'));
    cats.forEach(c => filtrosCont.appendChild(mkBtn(c, c)));
  }

  // ── Aplicar filtros ───────────────────────────────────────────────────────
  function aplicar() {
    let lista = [...todos];
    if (catActiva && catActiva !== 'todos') lista = lista.filter(p => p.categoria === catActiva);
    if (buscar) {
      const q = buscar.toLowerCase();
      lista = lista.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
    }

    if (countTienda) countTienda.textContent = lista.length + ' producto' + (lista.length !== 1 ? 's' : '');
    renderGrid(lista);
  }

  // ── Render grid ───────────────────────────────────────────────────────────
  function renderGrid(lista) {
    if (!gridTienda) return;
    gridTienda.innerHTML = '';

    if (!lista.length) {
      if (emptyTienda) emptyTienda.style.display = '';
      return;
    }
    if (emptyTienda) emptyTienda.style.display = 'none';

    lista.forEach(p => {
      const precios = [];
      if (p.precio_unidad) precios.push({ val: 'unidad', label: 'Unidad', precio: p.precio_unidad });
      if (p.precio_medio)  precios.push({ val: 'medio',  label: '½ docena', precio: p.precio_medio });
      if (p.precio_docena) precios.push({ val: 'docena', label: 'Docena', precio: p.precio_docena });

      const opts = precios.map(pr => `<option value="${pr.val}" data-precio="${pr.precio}">${pr.label} — ${formatPrecio(pr.precio)}</option>`).join('');

      const card = document.createElement('article');
      card.setAttribute('role', 'listitem');
      card.style.cssText = 'background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)';
      card.innerHTML = `
        <a href="producto.php?id=${p.id}" style="display:block;text-decoration:none;color:inherit">
          <div style="aspect-ratio:4/3;overflow:hidden;background:#f5efe5">
            ${p.imagen_url
              ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem">🍞</div>`}
          </div>
          <div style="padding:12px 12px 4px">
            <div style="font-weight:700;font-size:.95rem;margin-bottom:6px">${p.nombre}</div>
            ${p.descripcion ? `<div style="font-size:.8rem;color:#888;margin-bottom:6px">${p.descripcion.slice(0,60)}${p.descripcion.length>60?'…':''}</div>` : ''}
          </div>
        </a>
        <div style="padding:0 12px 12px;display:flex;flex-direction:column;gap:6px">
          ${precios.length > 1
            ? `<select class="sel-tipo" style="padding:6px 8px;border:1px solid #ddd;border-radius:8px;font-size:.85rem">${opts}</select>`
            : `<div style="font-weight:700;color:#C8601A">${formatPrecio(precios[0]?.precio)}</div>`}
          <div style="display:flex;align-items:center;gap:6px">
            <input type="number" class="inp-cant" value="1" min="1" ${p.stock ? 'max="'+p.stock+'"' : ''} style="width:54px;padding:6px;border:1px solid #ddd;border-radius:8px;text-align:center;font-size:.9rem">
            <button class="btn-agregar" style="flex:1;padding:8px;background:#C8601A;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.88rem">
              Agregar 🛒
            </button>
          </div>
        </div>
      `;

      card.querySelector('.btn-agregar').addEventListener('click', () => {
        const sel = card.querySelector('.sel-tipo');
        const opt = sel ? sel.options[sel.selectedIndex] : null;
        const precio = opt ? parseFloat(opt.dataset.precio) : (precios[0]?.precio || 0);
        const tipo   = opt ? opt.value : (precios[0]?.val || 'unidad');
        const cant   = parseInt(card.querySelector('.inp-cant').value) || 1;

        const ok = agregarItem({ producto_id: p.id, nombre: p.nombre, precio_unit: precio, tipo_precio: tipo, cantidad: cant, panaderia_id: panaderiaId });
        if (ok) toast(p.nombre + ' agregado al carrito 🛒', 'ok');
      });

      gridTienda.appendChild(card);
    });
  }

})();
