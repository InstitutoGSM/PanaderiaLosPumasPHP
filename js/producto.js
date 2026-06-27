// ─── producto.js ──────────────────────────────────────────────────────────────
// Maneja producto.php: carga y renderiza el detalle de un producto en #prod-wrap
import { api, toast, formatPrecio, getParam, badgeEstado } from './utils.js';
import { getSession, initNav } from './auth.js';
import { initCarritoUI, agregarItem } from './carrito.js';
import { cargarCalificaciones, getMiCalificacion, enviarCalificacion, widgetEstrellas, estrellasSVG } from './calificaciones.js';

(async function () {

  const prodId = getParam('id');
  if (!prodId) { window.location.href = 'catalogo.php'; return; }

  const [u] = await Promise.all([getSession()]);
  initNav(u);
  initCarritoUI();

  // ── Cargar producto ───────────────────────────────────────────────────────
  const r = await api(`api/productos.php?action=detalle&id=${prodId}`);

  const wrap = document.getElementById('prod-wrap');
  if (!r.ok || !r.data) {
    if (wrap) wrap.innerHTML = '<p style="text-align:center;padding:40px;color:#c62828">Producto no encontrado.</p>';
    return;
  }

  const p = r.data;
  document.title = p.nombre + ' — PanaderiaMarket';

  // ── Render producto ───────────────────────────────────────────────────────
  const precios = [];
  if (p.precio_unidad) precios.push({ val: 'unidad', label: 'Unidad', precio: p.precio_unidad });
  if (p.precio_medio)  precios.push({ val: 'medio',  label: '½ docena', precio: p.precio_medio });
  if (p.precio_docena) precios.push({ val: 'docena', label: 'Docena', precio: p.precio_docena });

  const opts = precios.map(pr => `<option value="${pr.val}" data-precio="${pr.precio}">${pr.label} — ${formatPrecio(pr.precio)}</option>`).join('');

  if (wrap) {
    wrap.innerHTML = `
      <div class="prod-layout" style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;padding:24px 0">
        <div>
          ${p.imagen_url
            ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%;border-radius:16px;object-fit:cover;aspect-ratio:1">`
            : `<div style="width:100%;aspect-ratio:1;background:#f5efe5;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:5rem">🍞</div>`}
        </div>
        <div>
          ${p.panaderia_nombre ? `<a href="tienda.php?id=${p.panaderia_id}" style="font-size:.85rem;color:#888;text-decoration:none">🏪 ${p.panaderia_nombre}</a>` : ''}
          <h1 style="margin:8px 0 6px;font-size:1.6rem;font-weight:800">${p.nombre}</h1>
          ${p.descripcion ? `<p style="color:#555;font-size:.93rem;margin-bottom:14px;line-height:1.6">${p.descripcion}</p>` : ''}
          ${p.destacado ? `<span style="font-size:.8rem;background:#fff3e0;color:#e65100;padding:3px 10px;border-radius:999px;font-weight:700">⭐ Destacado</span>` : ''}
          ${p.stock !== null && p.stock !== undefined ? `<p style="font-size:.85rem;color:#888;margin:10px 0">Stock disponible: <strong>${p.stock}</strong></p>` : ''}

          <div id="prod-precios" style="margin:16px 0">
            ${precios.map(pr => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0e8d8"><span style="color:#666">${pr.label}</span><strong style="color:#C8601A;font-size:1.1rem">${formatPrecio(pr.precio)}</strong></div>`).join('')}
          </div>

          <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
            ${precios.length > 1
              ? `<select id="sel-tipo" style="flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:10px;font-size:.9rem">${opts}</select>`
              : ''}
            <input id="inp-cant" type="number" value="1" min="1" ${p.stock ? 'max="'+p.stock+'"' : ''} style="width:64px;padding:9px;border:1px solid #ddd;border-radius:10px;text-align:center;font-size:.95rem">
            <button id="btn-agregar-carrito" style="flex:2;padding:12px 18px;background:#C8601A;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:.95rem;min-width:140px">
              Agregar al carrito 🛒
            </button>
          </div>
        </div>
      </div>

      <div style="margin-top:32px">
        <h2 style="font-size:1.1rem;margin-bottom:16px">Calificaciones</h2>
        <div id="cals-container"></div>
        <div id="form-calificar" style="margin-top:20px"></div>
      </div>
    `;

    // Agregar al carrito
    document.getElementById('btn-agregar-carrito')?.addEventListener('click', () => {
      const sel   = document.getElementById('sel-tipo');
      const opt   = sel ? sel.options[sel.selectedIndex] : null;
      const precio = opt ? parseFloat(opt.dataset.precio) : (precios[0]?.precio || 0);
      const tipo   = opt ? opt.value : (precios[0]?.val || 'unidad');
      const cant   = parseInt(document.getElementById('inp-cant')?.value) || 1;

      const ok = agregarItem({ producto_id: p.id, nombre: p.nombre, precio_unit: precio, tipo_precio: tipo, cantidad: cant, panaderia_id: p.panaderia_id });
      if (ok) toast(p.nombre + ' agregado al carrito 🛒', 'ok');
    });

    // Calificaciones
    await cargarCalificaciones(prodId, document.getElementById('cals-container'));
    await renderFormCalificar(prodId, u, document.getElementById('form-calificar'));
  }

  // ── Formulario de calificación ─────────────────────────────────────────────
  async function renderFormCalificar(prodId, usuario, container) {
    if (!container) return;

    if (!usuario) {
      container.innerHTML = `<p style="color:#888;font-size:.9rem">Para calificar este producto, <a href="login.php" style="color:#C8601A">iniciá sesión</a>.</p>`;
      return;
    }

    const miCal = await getMiCalificacion(prodId);
    if (miCal) {
      container.innerHTML = `
        <div style="background:#f5efe5;border-radius:10px;padding:14px">
          <strong>Tu calificación:</strong> ${estrellasSVG(miCal.estrellas)}
          ${miCal.comentario ? `<p style="margin:6px 0 0;font-size:.88rem;color:#555">"${miCal.comentario}"</p>` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="background:#fff;border:1px solid #f0e8d8;border-radius:12px;padding:18px">
        <h3 style="margin:0 0 12px;font-size:.95rem">Dejá tu calificación</h3>
        <div id="widget-estrellas" style="display:flex;gap:4px;margin-bottom:12px"></div>
        <textarea id="cal-comentario" placeholder="Comentario opcional..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:.9rem;resize:vertical;min-height:70px;box-sizing:border-box"></textarea>
        <button id="btn-cal-enviar" style="margin-top:10px;padding:10px 20px;background:#C8601A;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">
          Enviar calificación
        </button>
      </div>
    `;

    let estrellasSel = 0;
    const widget = widgetEstrellas(document.getElementById('widget-estrellas'), n => { estrellasSel = n; });

    document.getElementById('btn-cal-enviar')?.addEventListener('click', async () => {
      if (!estrellasSel) { toast('Seleccioná una cantidad de estrellas', 'warn'); return; }
      const comentario = document.getElementById('cal-comentario')?.value.trim() || '';
      const rCal = await enviarCalificacion({ producto_id: prodId, estrellas: estrellasSel, comentario });
      if (!rCal.ok) { toast(rCal.error || 'Error al enviar', 'error'); return; }
      toast('¡Calificación enviada!', 'ok');
      await cargarCalificaciones(prodId, document.getElementById('cals-container'));
      await renderFormCalificar(prodId, usuario, container);
    });
  }

})();
