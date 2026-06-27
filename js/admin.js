// ─── admin.js ─────────────────────────────────────────────────────────────────
// Panel de revisión de documentos de vendedores (admin.php)
// Muestra lista de vendedores con su estado de documentación.
import { api, toast, cap, formatFecha, setLoading } from './utils.js';
import { requireSession, logout } from './auth.js';

(async function () {

  const u = await requireSession('admin');
  if (!u) return;

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', logout);

  // ── Stats ──────────────────────────────────────────────────────────────────
  // #st-pendientes, #st-aprobados, #st-rechazados, #st-sin-enviar
  async function cargarStats() {
    const r = await api('api/admin.php?action=stats');
    if (!r.ok) return;
    const s = r.data;
    _set('st-pendientes',  s.pendientes  ?? s.docs_pendientes  ?? 0);
    _set('st-aprobados',   s.aprobados   ?? s.docs_aprobados   ?? 0);
    _set('st-rechazados',  s.rechazados  ?? s.docs_rechazados  ?? 0);
    _set('st-sin-enviar',  s.sin_enviar  ?? s.docs_sin_enviar  ?? 0);
  }

  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Lista de vendedores ────────────────────────────────────────────────────
  const listaVendedores = document.getElementById('lista-vendedores');
  const emptyVendedores = document.getElementById('empty-vendedores');
  let estadoFiltro = 'todos';
  let todosVendedores = [];

  // Filtros .filtro[data-estado]
  document.querySelectorAll('.filtro[data-estado]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro[data-estado]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      estadoFiltro = btn.dataset.estado;
      renderVendedores();
    });
  });

  async function cargarVendedores() {
    const r = await api('api/admin.php?action=usuarios&tipo=vendedor');
    if (!r.ok) { toast(r.error || 'Error al cargar vendedores', 'error'); return; }
    todosVendedores = r.data || [];
    renderVendedores();
  }

  function renderVendedores() {
    if (!listaVendedores) return;
    let lista = [...todosVendedores];

    if (estadoFiltro !== 'todos') {
      lista = lista.filter(v => (v.doc_estado || 'sin_enviar') === estadoFiltro);
    }

    if (!lista.length) {
      if (emptyVendedores) emptyVendedores.style.display = '';
      listaVendedores.innerHTML = '';
      return;
    }
    if (emptyVendedores) emptyVendedores.style.display = 'none';

    listaVendedores.innerHTML = '';
    lista.forEach(v => {
      const estado = v.doc_estado || 'sin_enviar';
      const BADGE = {
        pendiente:  ['#7c4a00','#fff3e0','⏳ Pendiente'],
        aprobado:   ['#1b5e20','#e8f5e9','✅ Aprobado'],
        rechazado:  ['#b71c1c','#ffebee','❌ Rechazado'],
        sin_enviar: ['#424242','#f5f5f5','📤 Sin enviar'],
      };
      const [col, bg, lbl] = BADGE[estado] || BADGE.sin_enviar;

      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08);margin-bottom:14px';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div>
            <div style="font-weight:700;font-size:1rem">${v.nombre}</div>
            <div style="font-size:.85rem;color:#888">${v.email}</div>
            ${v.panaderia_nombre ? `<div style="font-size:.82rem;color:#C8601A;margin-top:2px">🏪 ${v.panaderia_nombre}</div>` : ''}
          </div>
          <span style="padding:4px 14px;border-radius:999px;font-size:.82rem;font-weight:700;color:${col};background:${bg}">${lbl}</span>
        </div>

        ${v.doc_mensaje ? `<div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:.85rem;color:#555;margin-bottom:12px"><strong>Mensaje previo:</strong> ${v.doc_mensaje}</div>` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${estado === 'pendiente' ? `
            <button class="btn-aprobar" data-id="${v.id}" style="padding:8px 16px;border-radius:8px;border:none;background:#1b5e20;color:#fff;cursor:pointer;font-weight:700;font-size:.85rem">✅ Aprobar</button>
            <button class="btn-rechazar" data-id="${v.id}" style="padding:8px 16px;border-radius:8px;border:none;background:#b71c1c;color:#fff;cursor:pointer;font-weight:700;font-size:.85rem">❌ Rechazar con nota</button>
          ` : ''}
          ${estado === 'sin_enviar' ? `
            <button class="btn-rechazar" data-id="${v.id}" style="padding:8px 16px;border-radius:8px;border:none;background:#e65100;color:#fff;cursor:pointer;font-weight:700;font-size:.85rem">📩 Enviar corrección</button>
          ` : ''}
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.85rem;margin-left:auto">
            <input type="checkbox" class="chk-activo" data-id="${v.id}" ${v.activo ? 'checked' : ''}>
            <span>Cuenta activa</span>
          </label>
        </div>
      `;

      card.querySelector('.btn-aprobar')?.addEventListener('click', () => aprobarVendedor(v.id, card));
      card.querySelector('.btn-rechazar')?.addEventListener('click', () => abrirModalCorregir(v));
      card.querySelector('.chk-activo').addEventListener('change', () => toggleUsuario(v.id));

      listaVendedores.appendChild(card);
    });
  }

  async function aprobarVendedor(id, card) {
    const r = await api('api/admin.php?action=aprobar-vendedor', { method: 'POST', body: { id } });
    if (!r.ok) { toast(r.error || 'Error al aprobar', 'error'); return; }
    toast('Vendedor aprobado ✓', 'ok');
    await Promise.all([cargarStats(), cargarVendedores()]);
  }

  async function toggleUsuario(id) {
    const r = await api('api/admin.php?action=toggle-usuario', { method: 'POST', body: { id } });
    if (!r.ok) toast(r.error || 'Error al cambiar estado', 'error');
    else toast('Estado de cuenta actualizado', 'ok');
  }

  // ── Modal de corrección ────────────────────────────────────────────────────
  const modal           = document.getElementById('modal-corregir');
  const modalNombre     = document.getElementById('modal-nombre-vendedor');
  const modalMensaje    = document.getElementById('modal-mensaje');
  const btnEnviarCorr   = document.getElementById('btn-enviar-correccion');
  const btnCerrarModal  = document.getElementById('btn-cerrar-modal');

  let vendedorActivo = null;

  function abrirModalCorregir(v) {
    vendedorActivo = v;
    if (modal) modal.style.display = 'flex';
    if (modalNombre)  modalNombre.textContent = v.nombre;
    if (modalMensaje) modalMensaje.value = '';
  }

  if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      vendedorActivo = null;
    });
  }

  // Cerrar modal al hacer click fuera
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal) { modal.style.display = 'none'; vendedorActivo = null; } });
  }

  if (btnEnviarCorr) {
    btnEnviarCorr.addEventListener('click', async () => {
      if (!vendedorActivo) return;
      const mensaje = modalMensaje?.value.trim() || '';
      if (!mensaje) { toast('Escribí un mensaje de corrección', 'warn'); return; }

      setLoading(btnEnviarCorr, true);
      const r = await api('api/admin.php?action=enviar-correccion', {
        method: 'POST',
        body: { id: vendedorActivo.id, mensaje }
      });
      setLoading(btnEnviarCorr, false, 'Enviar corrección');

      if (!r.ok) { toast(r.error || 'Error al enviar', 'error'); return; }
      toast('Corrección enviada ✓', 'ok');
      if (modal) modal.style.display = 'none';
      vendedorActivo = null;
      await Promise.all([cargarStats(), cargarVendedores()]);
    });
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────
  await Promise.all([cargarStats(), cargarVendedores()]);

})();
