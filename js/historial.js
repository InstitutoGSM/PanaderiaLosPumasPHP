// ─── historial.js ─────────────────────────────────────────────────────────────
// Maneja historial.php: perfil + lista de pedidos del comprador
import { api, toast, formatPrecio, formatFecha, iniciales, cap, badgeEstado } from './utils.js';
import { requireSession, logout } from './auth.js';

(async function () {

  const u = await requireSession();
  if (!u) return;

  // Logout
  const btnLogout = document.getElementById('nav-logout');
  if (btnLogout) btnLogout.addEventListener('click', logout);

  // ── Perfil ────────────────────────────────────────────────────────────────
  const perfilWrap = document.getElementById('perfil-wrap');
  if (perfilWrap) {
    perfilWrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:60px;height:60px;border-radius:50%;background:#C8601A;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;flex-shrink:0">${iniciales(u.nombre)}</div>
        <div>
          <div style="font-weight:700;font-size:1.1rem">${u.nombre}</div>
          <div style="color:#888;font-size:.88rem">${u.email}</div>
        </div>
      </div>
    `;
  }

  // ── Pedidos ───────────────────────────────────────────────────────────────
  const listaHistorial = document.getElementById('lista-historial');
  const emptyHistorial = document.getElementById('empty-historial');

  const r = await api('api/pedidos.php?action=mis-pedidos');

  if (!r.ok) {
    toast(r.error || 'Error al cargar pedidos', 'error');
    return;
  }

  const pedidos = r.data || [];

  if (!pedidos.length) {
    if (emptyHistorial) emptyHistorial.style.display = '';
    if (listaHistorial) listaHistorial.innerHTML = '';
    return;
  }

  if (emptyHistorial) emptyHistorial.style.display = 'none';
  if (!listaHistorial) return;

  listaHistorial.innerHTML = pedidos.map(ped => {
    const total = (ped.items || []).reduce((s, i) => s + i.precio_unit * i.cantidad, 0);
    const items = (ped.items || []).map(i =>
      `<div style="display:flex;justify-content:space-between;font-size:.85rem;padding:4px 0;border-bottom:1px solid #f5efe5">
        <span>${i.nombre} <small style="color:#888">(${i.tipo_precio})</small></span>
        <span>${i.cantidad} × ${formatPrecio(i.precio_unit)}</span>
      </div>`
    ).join('');

    return `
      <div style="background:#fff;border-radius:14px;padding:18px;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;color:#C8601A;font-size:.95rem">Pedido #${ped.ticket || ped.id?.slice(-6)}</div>
            <div style="font-size:.8rem;color:#888">${ped.panaderia_nombre || ''} · ${formatFecha(ped.created_at)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${badgeEstado(ped.estado)}
            <span style="font-size:.8rem;color:#888">${cap(ped.medio_pago || '')}</span>
          </div>
        </div>
        <div style="margin-bottom:10px">${items}</div>
        <div style="display:flex;justify-content:flex-end;font-weight:700">Total: ${formatPrecio(total)}</div>
        ${ped.notas ? `<div style="margin-top:8px;font-size:.82rem;color:#888">📝 ${ped.notas}</div>` : ''}
      </div>
    `;
  }).join('');

})();
