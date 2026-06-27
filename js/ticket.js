// ─── ticket.js ────────────────────────────────────────────────────────────────
// Muestra el resumen del pedido tras el checkout.
// Si existe ticket.php, este archivo lo maneja.
// Si no existe, el checkout.js muestra el resultado inline.
import { api, toast, formatPrecio, formatFecha, cap, badgeEstado, getParam } from './utils.js';
import { getSession } from './auth.js';
import { limpiarCarrito } from './carrito.js';

(async function () {

  const ticket = getParam('ticket') || localStorage.getItem('ultimo_ticket');

  if (!ticket) {
    toast('No se encontró el ticket del pedido', 'error');
    setTimeout(() => { window.location.href = 'historial.php'; }, 2000);
    return;
  }

  const r = await api(`api/pedidos.php?action=detalle&ticket=${ticket}`);

  if (!r.ok || !r.data) {
    toast('No se encontró el pedido', 'error');
    setTimeout(() => { window.location.href = 'historial.php'; }, 2000);
    return;
  }

  const ped = r.data;

  // Limpiar carrito y ticket guardado
  limpiarCarrito();
  localStorage.removeItem('ultimo_ticket');

  // Renderizar en #ticket-wrap o en body
  const wrap = document.getElementById('ticket-wrap') || document.getElementById('ticket-contenido') || document.body;

  const total = (ped.items || []).reduce((s, i) => s + i.precio_unit * i.cantidad, 0);

  wrap.innerHTML = `
    <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,.1);overflow:hidden">
      <div style="background:#C8601A;color:#fff;padding:28px 24px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:8px">✅</div>
        <h1 style="margin:0;font-size:1.4rem">¡Pedido confirmado!</h1>
        <p style="margin:8px 0 0;opacity:.85;font-size:.9rem">Tu pedido fue recibido. El vendedor se pondrá en contacto.</p>
      </div>
      <div style="padding:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:.9rem">
          <span style="color:#888">Ticket</span>
          <strong style="color:#C8601A">${ped.ticket || ped.id?.slice(-8)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:.9rem">
          <span style="color:#888">Estado</span>
          <span>${badgeEstado(ped.estado)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:.9rem">
          <span style="color:#888">Panadería</span>
          <span>${ped.panaderia_nombre || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:.9rem">
          <span style="color:#888">Medio de pago</span>
          <span>${cap(ped.medio_pago || '')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:.9rem">
          <span style="color:#888">Fecha</span>
          <span>${formatFecha(ped.created_at)}</span>
        </div>
        <hr style="border:none;border-top:1px solid #f0e8d8;margin:16px 0">
        <h3 style="margin:0 0 12px;font-size:.95rem">Productos</h3>
        ${(ped.items || []).map(i => `
          <div style="display:flex;justify-content:space-between;font-size:.88rem;padding:5px 0;border-bottom:1px solid #f5efe5">
            <span>${i.nombre} <small style="color:#888">(${i.tipo_precio})</small> × ${i.cantidad}</span>
            <span>${formatPrecio(i.precio_unit * i.cantidad)}</span>
          </div>
        `).join('')}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.05rem;margin-top:14px">
          <span>Total</span><span style="color:#C8601A">${formatPrecio(total)}</span>
        </div>
        ${ped.medio_pago === 'transferencia' && ped.cbu_alias ? `
          <div style="margin-top:16px;background:#fff8f0;border-radius:10px;padding:14px;font-size:.88rem">
            <strong>Datos para la transferencia:</strong><br>
            Alias: <strong>${ped.cbu_alias}</strong>
            ${ped.titular_cbu ? `<br>Titular: <strong>${ped.titular_cbu}</strong>` : ''}
          </div>
        ` : ''}
        <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
          <a href="historial.php" style="flex:1;text-align:center;padding:12px;background:#C8601A;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Ver mis pedidos</a>
          <a href="catalogo.php" style="flex:1;text-align:center;padding:12px;background:#f5efe5;color:#3B1A0A;border-radius:10px;text-decoration:none;font-weight:700">Seguir comprando</a>
        </div>
      </div>
    </div>
  `;

})();
