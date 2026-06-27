// ─── carrito.js ───────────────────────────────────────────────────────────────
// Gestión del carrito con localStorage.
// Exporta funciones de datos + initCarritoUI() para el drawer.
import { formatPrecio, toast } from './utils.js';

const KEY = 'carrito';

// ── Datos ─────────────────────────────────────────────────────────────────────
export function getCarrito() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { panaderia_id: null, items: [] }; }
  catch { return { panaderia_id: null, items: [] }; }
}

function guardar(c) {
  localStorage.setItem(KEY, JSON.stringify(c));
  window.dispatchEvent(new CustomEvent('carritoActualizado', { detail: c }));
}

export function agregarItem(item) {
  const c = getCarrito();
  if (c.panaderia_id && c.panaderia_id !== item.panaderia_id && c.items.length > 0) {
    if (!confirm('¡Tu carrito tiene productos de otra panadería!\n¿Querés vaciarlo y empezar de nuevo?')) return false;
    c.items = [];
  }
  c.panaderia_id = item.panaderia_id;
  const idx = c.items.findIndex(i => i.producto_id === item.producto_id && i.tipo_precio === item.tipo_precio);
  if (idx >= 0) c.items[idx].cantidad += item.cantidad || 1;
  else c.items.push({ producto_id: item.producto_id, nombre: item.nombre, precio_unit: item.precio_unit, tipo_precio: item.tipo_precio, cantidad: item.cantidad || 1 });
  guardar(c);
  return true;
}

export function quitarItem(idx) {
  const c = getCarrito();
  c.items.splice(idx, 1);
  if (!c.items.length) c.panaderia_id = null;
  guardar(c);
}

export function cambiarCantidad(idx, cant) {
  const c = getCarrito();
  if (cant <= 0) { c.items.splice(idx, 1); if (!c.items.length) c.panaderia_id = null; }
  else if (c.items[idx]) c.items[idx].cantidad = cant;
  guardar(c);
}

export function limpiarCarrito() { guardar({ panaderia_id: null, items: [] }); }

export function calcularTotal() {
  return getCarrito().items.reduce((s, i) => s + i.precio_unit * i.cantidad, 0);
}

export function getCount() {
  return getCarrito().items.reduce((s, i) => s + i.cantidad, 0);
}

// ── UI — Badge ────────────────────────────────────────────────────────────────
function actualizarBadge() {
  const n = getCount();
  // .cart-badge es el <span> dentro de #cart-toggle
  document.querySelectorAll('.cart-badge').forEach(el => { el.textContent = n; });
}

// ── UI — Drawer ───────────────────────────────────────────────────────────────
// Espera: #cart-toggle, #cart-overlay, #cart-drawer, #cart-close, #cart-body, #cart-footer
export function initCarritoUI() {
  const toggle  = document.getElementById('cart-toggle');
  const overlay = document.getElementById('cart-overlay');
  const drawer  = document.getElementById('cart-drawer');
  const close   = document.getElementById('cart-close');
  const body    = document.getElementById('cart-body');
  const footer  = document.getElementById('cart-footer');

  if (!drawer) return;

  function abrirDrawer() {
    drawer.classList.add('open');
    if (overlay) { overlay.style.display = ''; setTimeout(() => overlay.classList.add('open'), 10); }
    renderDrawer();
  }
  function cerrarDrawer() {
    drawer.classList.remove('open');
    if (overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.style.display = 'none', 300); }
  }

  if (toggle)  toggle.addEventListener('click', abrirDrawer);
  if (close)   close.addEventListener('click', cerrarDrawer);
  if (overlay) overlay.addEventListener('click', cerrarDrawer);

  function renderDrawer() {
    const c = getCarrito();
    if (!body) return;

    if (!c.items.length) {
      body.innerHTML = '<p style="padding:24px;text-align:center;color:#888">Tu carrito está vacío 🛒</p>';
      if (footer) footer.innerHTML = '';
      return;
    }

    body.innerHTML = c.items.map((item, idx) => `
      <div style="display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid #f0e8d8">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.nombre}</div>
          <div style="font-size:.8rem;color:#888">${item.tipo_precio} · ${formatPrecio(item.precio_unit)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button data-dec="${idx}" style="width:26px;height:26px;border-radius:50%;border:1px solid #ddd;background:#fff;font-size:1rem;cursor:pointer">−</button>
          <span style="min-width:20px;text-align:center;font-weight:700">${item.cantidad}</span>
          <button data-inc="${idx}" style="width:26px;height:26px;border-radius:50%;border:1px solid #ddd;background:#fff;font-size:1rem;cursor:pointer">+</button>
          <button data-del="${idx}" style="width:26px;height:26px;border-radius:50%;border:none;background:#fee2e2;color:#c62828;font-size:.9rem;cursor:pointer">✕</button>
        </div>
        <div style="font-weight:700;font-size:.95rem;min-width:60px;text-align:right">${formatPrecio(item.precio_unit * item.cantidad)}</div>
      </div>
    `).join('');

    body.querySelectorAll('[data-dec]').forEach(btn => btn.addEventListener('click', () => { cambiarCantidad(+btn.dataset.dec, getCarrito().items[btn.dataset.dec].cantidad - 1); renderDrawer(); }));
    body.querySelectorAll('[data-inc]').forEach(btn => btn.addEventListener('click', () => { cambiarCantidad(+btn.dataset.inc, getCarrito().items[btn.dataset.inc].cantidad + 1); renderDrawer(); }));
    body.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => { quitarItem(+btn.dataset.del); renderDrawer(); }));

    if (footer) {
      footer.innerHTML = `
        <div style="padding:14px 16px;border-top:2px solid #f0e8d8">
          <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:12px">
            <span>Total</span><span>${formatPrecio(calcularTotal())}</span>
          </div>
          <a href="checkout.php" style="display:block;text-align:center;background:#C8601A;color:#fff;padding:12px;border-radius:10px;font-weight:700;text-decoration:none">Ir al checkout →</a>
          <button id="cart-vaciar" style="display:block;width:100%;margin-top:8px;padding:8px;background:none;border:1px solid #ddd;border-radius:8px;cursor:pointer;color:#888;font-size:.85rem">Vaciar carrito</button>
        </div>
      `;
      footer.querySelector('#cart-vaciar').addEventListener('click', () => {
        if (confirm('¿Vaciar el carrito?')) { limpiarCarrito(); renderDrawer(); }
      });
    }
  }

  // Actualizar badge en cambios
  window.addEventListener('carritoActualizado', () => { actualizarBadge(); if (drawer.classList.contains('open')) renderDrawer(); });
  actualizarBadge();
}
