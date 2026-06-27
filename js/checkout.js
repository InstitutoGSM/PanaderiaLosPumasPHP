// ─── checkout.js ──────────────────────────────────────────────────────────────
// Maneja checkout.php: resumen + form de datos del comprador + tarjeta
import { api, toast, formatPrecio, setLoading, cap } from './utils.js';
import { requireSession } from './auth.js';
import { getCarrito, calcularTotal, limpiarCarrito } from './carrito.js';

(async function () {

  const u = await requireSession();
  if (!u) return;

  const carrito = getCarrito();
  if (!carrito.items || !carrito.items.length) {
    toast('Tu carrito está vacío', 'warn');
    setTimeout(() => { window.location.href = 'catalogo.php'; }, 1500);
    return;
  }

  // ── Pre-llenar datos del usuario ──────────────────────────────────────────
  const coNombre = document.getElementById('co-nombre');
  const coEmail  = document.getElementById('co-email');
  const coCp     = document.getElementById('co-cp');
  const coDir    = document.getElementById('co-dir');
  const coNotas  = document.getElementById('co-notas');

  if (coNombre && u.nombre) coNombre.value = u.nombre;
  if (coEmail  && u.email)  coEmail.value  = u.email;

  // ── Resumen del carrito ───────────────────────────────────────────────────
  const resumenItems = document.getElementById('resumen-items');
  const resumenTotal = document.getElementById('resumen-total');

  function renderResumen() {
    if (!resumenItems) return;
    resumenItems.innerHTML = carrito.items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0e8d8;font-size:.88rem">
        <div>
          <div style="font-weight:600">${item.nombre}</div>
          <div style="color:#888;font-size:.8rem">${cap(item.tipo_precio)} × ${item.cantidad}</div>
        </div>
        <strong style="color:#C8601A">${formatPrecio(item.precio_unit * item.cantidad)}</strong>
      </div>
    `).join('');
    if (resumenTotal) resumenTotal.textContent = formatPrecio(calcularTotal());
  }
  renderResumen();

  // ── Tarjeta virtual (vista previa) ────────────────────────────────────────
  // IDs: #t-numero, #t-nombre, #t-vence, #t-cvv (inputs)
  //      #tv-numero, #tv-nombre, #tv-vence, #tv-brand (display)
  const tNumero = document.getElementById('t-numero');
  const tNombre = document.getElementById('t-nombre');
  const tVence  = document.getElementById('t-vence');
  const tCvv    = document.getElementById('t-cvv');
  const tvNumero = document.getElementById('tv-numero');
  const tvNombre = document.getElementById('tv-nombre');
  const tvVence  = document.getElementById('tv-vence');
  const tvBrand  = document.getElementById('tv-brand');

  function tarjetaVista() {
    const n = (tNumero?.value || '').replace(/\s/g, '').padEnd(16, '•');
    const chunks = n.match(/.{1,4}/g) || [n];
    if (tvNumero) tvNumero.textContent = chunks.join(' ');
    if (tvNombre) tvNombre.textContent = tNombre?.value || 'NOMBRE APELLIDO';
    if (tvVence)  tvVence.textContent  = tVence?.value  || 'MM/AA';
    if (tvBrand) {
      const num = (tNumero?.value || '').replace(/\D/g, '');
      if (num.startsWith('4'))      tvBrand.textContent = 'VISA';
      else if (num.startsWith('5')) tvBrand.textContent = 'MASTERCARD';
      else                          tvBrand.textContent = '';
    }
  }

  // Formato automático del número de tarjeta (grupos de 4)
  if (tNumero) {
    tNumero.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').slice(0, 16);
      this.value = v.match(/.{1,4}/g)?.join(' ') || v;
      tarjetaVista();
    });
  }
  if (tNombre) tNombre.addEventListener('input', tarjetaVista);
  if (tVence) {
    tVence.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
      this.value = v;
      tarjetaVista();
    });
  }
  if (tCvv) tCvv.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); });

  tarjetaVista();

  // ── Finalizar pedido ──────────────────────────────────────────────────────
  const btnFinalizar = document.getElementById('btn-finalizar');

  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', async () => {
      const nombre = coNombre?.value.trim() || '';
      const email  = coEmail?.value.trim()  || '';
      const dir    = coDir?.value.trim()    || '';
      const cp     = coCp?.value.trim()     || '';
      const notas  = coNotas?.value.trim()  || '';

      // Validar campos obligatorios
      if (!nombre || !email) {
        toast('Completá nombre y email', 'warn'); return;
      }

      // Validar tarjeta (solo si el form de tarjeta existe)
      const numTarjeta = tNumero?.value.replace(/\s/g, '') || '';
      if (tNumero) {
        if (numTarjeta.length < 13) { toast('Ingresá un número de tarjeta válido', 'warn'); return; }
        if (!tNombre?.value.trim()) { toast('Ingresá el nombre del titular', 'warn'); return; }
        if (!tVence?.value)        { toast('Ingresá la fecha de vencimiento', 'warn'); return; }
        if (!tCvv?.value)          { toast('Ingresá el CVV', 'warn'); return; }
      }

      const payload = {
        panaderia_id:     carrito.panaderia_id,
        comprador_nombre: nombre,
        comprador_email:  email,
        comprador_dir:    dir,
        comprador_cp:     cp,
        notas,
        medio_pago:       'tarjeta',
        items: carrito.items.map(i => ({
          producto_id: i.producto_id,
          nombre:      i.nombre,
          tipo_precio: i.tipo_precio,
          precio_unit: i.precio_unit,
          cantidad:    i.cantidad,
        })),
      };

      setLoading(btnFinalizar, true);
      const r = await api('api/pedidos.php?action=crear', { method: 'POST', body: payload });
      setLoading(btnFinalizar, false, 'Finalizar pedido');

      if (!r.ok) { toast(r.error || 'Error al procesar el pedido', 'error'); return; }

      const ticketId = r.data?.ticket || r.data?.id;
      if (ticketId) localStorage.setItem('ultimo_ticket', ticketId);

      limpiarCarrito();
      toast('¡Pedido realizado exitosamente!', 'ok');
      setTimeout(() => {
        window.location.href = ticketId ? `ticket.php?ticket=${ticketId}` : 'historial.php';
      }, 700);
    });
  }

})();
