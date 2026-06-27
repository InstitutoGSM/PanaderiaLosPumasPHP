// ─── vendedor.js ──────────────────────────────────────────────────────────────
// Panel del vendedor. Secciones: dashboard, productos, pedidos, perfil.
import { api, toast, formatPrecio, formatFecha, cap, badgeEstado, setLoading } from './utils.js';
import { requireSession, logout } from './auth.js';
import { conectarUpload } from './upload.js';

(async function () {

  const u = await requireSession('vendedor');
  if (!u) return;

  // ── Sidebar / navegación por secciones ────────────────────────────────────
  // Secciones usan id="sec-X" y nav links usan .nav-link[data-sec]
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const mobMenu  = document.getElementById('mob-menu');
  const btnLogout = document.getElementById('btn-logout');

  function mostrarSeccion(sec) {
    document.querySelectorAll('[id^="sec-"]').forEach(el => {
      el.style.display = el.id === 'sec-' + sec ? '' : 'none';
    });
    document.querySelectorAll('.nav-link[data-sec]').forEach(n => {
      n.classList.toggle('active', n.dataset.sec === sec);
    });
    // cerrar sidebar en mobile
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  }

  document.querySelectorAll('.nav-link[data-sec]').forEach(n => {
    n.addEventListener('click', e => { e.preventDefault(); mostrarSeccion(n.dataset.sec); });
  });

  // Mobile sidebar toggle
  if (mobMenu) mobMenu.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('open'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); });
  if (btnLogout) btnLogout.addEventListener('click', logout);

  mostrarSeccion('dashboard');

  // Botones de acceso directo dentro del dashboard
  document.getElementById('ob-ir-agregar')?.addEventListener('click', () => mostrarSeccion('agregar'));
  document.getElementById('ob-ir-perfil')?.addEventListener('click',  () => mostrarSeccion('perfil'));

  // ── DASHBOARD — Stats ──────────────────────────────────────────────────────
  async function cargarStats() {
    const r = await api('api/panaderias.php?action=stats');
    if (!r.ok) return;
    const s = r.data;
    _set('st-activos',  s.productos          ?? s.productos_activos ?? 0);
    _set('st-total',    formatPrecio(s.total_ventas ?? s.ingresos_totales ?? 0));
    _set('st-pedidos',  s.total_pedidos       ?? 0);
    // Últimos pedidos rápidos en dashboard
    if (s.total_pedidos) _set('dash-sub', s.total_pedidos + ' pedidos en total');
  }

  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── PRODUCTOS — CRUD ──────────────────────────────────────────────────────
  const tbodyProds   = document.getElementById('tbody-productos');
  const btnIrAgregar = document.getElementById('btn-ir-agregar');
  const btnCancelar  = document.getElementById('btn-cancelar');
  const formTitulo   = document.getElementById('form-titulo');
  const editId       = document.getElementById('edit-id');
  const btnGuardar   = document.getElementById('btn-guardar');
  const imgPreview   = document.getElementById('img-preview');
  const imgFile      = document.getElementById('p-img-file');
  const imgUrl       = document.getElementById('p-img-url');
  const camposDocena = document.getElementById('campos-docena');
  const pUnidad      = document.getElementById('p-unidad'); // select: unidad/docena

  let productos  = [];
  let categorias = [];
  let urlImgProd = '';

  async function cargarProductos() {
    const [rProds, rCats] = await Promise.all([
      api(`api/productos.php?action=listar&panaderia_id=${u.panaderia_id}`),
      api('api/productos.php?action=categorias')
    ]);
    productos  = rProds.ok  ? (rProds.data  || []) : [];
    categorias = rCats.ok   ? (rCats.data   || []) : [];
    renderTablaProductos();
    llenarSelectCat();
  }

  function llenarSelectCat() {
    const sel = document.getElementById('p-cat');
    if (!sel) return;
    sel.innerHTML = '<option value="">Categoría</option>';
    categorias.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
  }

  function renderTablaProductos() {
    if (!tbodyProds) return;
    if (!productos.length) {
      tbodyProds.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Todavía no tenés productos</td></tr>';
      return;
    }
    tbodyProds.innerHTML = '';
    productos.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${p.imagen_url || ''}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;background:#f5efe5" onerror="this.style.display='none'"></td>
        <td style="font-weight:600">${p.nombre}</td>
        <td>${formatPrecio(p.precio_unidad)}</td>
        <td>${p.stock ?? '—'}</td>
        <td><span style="font-size:.78rem;background:#f5efe5;padding:2px 8px;border-radius:999px">${p.categoria_nombre || '—'}</span></td>
        <td>
          <label style="cursor:pointer">
            <input type="checkbox" ${p.activo ? 'checked' : ''} class="chk-toggle" data-id="${p.id}" style="width:16px;height:16px">
          </label>
        </td>
        <td style="white-space:nowrap">
          <button class="btn-editar" data-id="${p.id}" style="padding:4px 10px;border-radius:6px;border:1px solid #C8601A;background:#fff;color:#C8601A;cursor:pointer;font-size:.82rem;font-weight:600">Editar</button>
          <button class="btn-del"    data-id="${p.id}" data-nombre="${p.nombre}" style="padding:4px 10px;border-radius:6px;border:none;background:#fee2e2;color:#c62828;cursor:pointer;font-size:.82rem;font-weight:600;margin-left:4px">Borrar</button>
        </td>
      `;
      tr.querySelector('.chk-toggle').addEventListener('change', () => toggleProducto(p.id));
      tr.querySelector('.btn-editar').addEventListener('click',  () => editarProducto(p));
      tr.querySelector('.btn-del').addEventListener('click',     () => eliminarProducto(p.id, p.nombre));
      tbodyProds.appendChild(tr);
    });
  }

  // Ir a sección agregar (form vacío)
  if (btnIrAgregar) {
    btnIrAgregar.addEventListener('click', () => {
      limpiarForm();
      mostrarSeccion('agregar');
    });
  }

  // Cancelar edición → volver a lista
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      limpiarForm();
      mostrarSeccion('productos');
    });
  }

  function limpiarForm() {
    ['p-nombre','p-desc','p-precio','p-media-doc','p-docena','p-extra','p-img-url','p-stock'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['p-cat','p-unidad'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });
    if (editId)      editId.value = '';
    if (formTitulo)  formTitulo.textContent = 'Nuevo producto';
    if (imgPreview)  { imgPreview.src = ''; imgPreview.style.display = 'none'; }
    if (camposDocena) camposDocena.style.display = 'none';
    urlImgProd = '';
  }

  function editarProducto(p) {
    limpiarForm();
    if (editId) editId.value = p.id;
    if (formTitulo) formTitulo.textContent = 'Editar producto';
    _val('p-nombre', p.nombre);
    _val('p-desc',   p.descripcion);
    _val('p-cat',    p.categoria_id);
    _val('p-precio', p.precio_unidad);
    _val('p-media-doc', p.precio_medio);
    _val('p-docena', p.precio_docena);
    _val('p-extra',  p.precio_extra);
    _val('p-stock',  p.stock);
    _val('p-img-url', p.imagen_url);
    urlImgProd = p.imagen_url || '';
    if (imgPreview && p.imagen_url) { imgPreview.src = p.imagen_url; imgPreview.style.display = ''; }
    // Mostrar campos docena si hay precio docena
    if (camposDocena) camposDocena.style.display = (p.precio_docena || p.precio_medio) ? '' : 'none';
    mostrarSeccion('agregar');
  }

  function _val(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  }

  // Mostrar/ocultar campos de docena según tipo de precio
  if (pUnidad) {
    pUnidad.addEventListener('change', function () {
      if (camposDocena) camposDocena.style.display = this.value === 'docena' ? '' : 'none';
    });
  }

  // Preview de imagen local antes de subir
  if (imgFile && imgPreview) {
    conectarUpload(imgFile, imgPreview, 'producto', url => {
      urlImgProd = url;
      if (imgUrl) imgUrl.value = url;
    });
  }

  // Actualizar urlImgProd si se escribe una URL manualmente
  if (imgUrl) {
    imgUrl.addEventListener('input', function () {
      urlImgProd = this.value.trim();
      if (imgPreview && urlImgProd) { imgPreview.src = urlImgProd; imgPreview.style.display = ''; }
    });
  }

  // Guardar producto (crear o editar)
  if (btnGuardar) {
    btnGuardar.addEventListener('click', async () => {
      const id = editId?.value || null;
      const nombre = document.getElementById('p-nombre')?.value.trim() || '';
      if (!nombre) { toast('El nombre es obligatorio', 'warn'); return; }

      const payload = {
        panaderia_id:  u.panaderia_id,
        nombre,
        descripcion:   document.getElementById('p-desc')?.value.trim()    || null,
        categoria_id:  document.getElementById('p-cat')?.value             || null,
        precio_unidad: parseFloat(document.getElementById('p-precio')?.value)    || null,
        precio_medio:  parseFloat(document.getElementById('p-media-doc')?.value) || null,
        precio_docena: parseFloat(document.getElementById('p-docena')?.value)    || null,
        precio_extra:  parseFloat(document.getElementById('p-extra')?.value)     || null,
        stock:         parseInt(document.getElementById('p-stock')?.value)        || null,
        imagen_url:    urlImgProd || null,
      };
      if (id) payload.id = id;

      setLoading(btnGuardar, true);
      const r = await api(`api/productos.php?action=${id ? 'editar' : 'crear'}`, { method: 'POST', body: payload });
      setLoading(btnGuardar, false, id ? 'Guardar cambios' : 'Publicar producto');

      if (!r.ok) { toast(r.error || 'Error al guardar', 'error'); return; }
      toast(id ? 'Producto actualizado ✓' : 'Producto creado ✓', 'ok');
      limpiarForm();
      await cargarProductos();
      mostrarSeccion('productos');
    });
  }

  async function toggleProducto(id) {
    const r = await api('api/productos.php?action=toggle', { method: 'POST', body: { id } });
    if (!r.ok) toast(r.error || 'Error al cambiar estado', 'error');
  }

  async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    const r = await api('api/productos.php?action=eliminar', { method: 'POST', body: { id } });
    if (!r.ok) { toast(r.error || 'Error al eliminar', 'error'); return; }
    toast('Producto eliminado', 'ok');
    await cargarProductos();
  }

  // ── PEDIDOS ────────────────────────────────────────────────────────────────
  const listaPedidos   = document.getElementById('lista-pedidos');
  const emptyPedidos   = document.getElementById('empty-pedidos');
  const buscarPedidos  = document.getElementById('buscar-pedidos');
  const badgePedidos   = document.getElementById('badge-pedidos');
  let estadoFiltro     = '';
  let buscarTexto      = '';

  // Botones filtro de estado
  document.querySelectorAll('#filtros-pedidos [data-estado]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtros-pedidos [data-estado]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      estadoFiltro = btn.dataset.estado === 'todos' ? '' : btn.dataset.estado;
      cargarPedidos();
    });
  });

  if (buscarPedidos) buscarPedidos.addEventListener('input', () => { buscarTexto = buscarPedidos.value.trim(); cargarPedidos(); });

  async function cargarPedidos() {
    if (!listaPedidos) return;
    listaPedidos.innerHTML = '<p style="color:#888;padding:16px">Cargando…</p>';
    let url = `api/pedidos.php?action=vendedor&panaderia_id=${u.panaderia_id}`;
    if (estadoFiltro) url += `&estado=${estadoFiltro}`;
    const r = await api(url);
    if (!r.ok) { listaPedidos.innerHTML = '<p style="color:#c62828;padding:16px">Error al cargar pedidos</p>'; return; }
    let pedidos = r.data || [];
    if (buscarTexto) {
      const q = buscarTexto.toLowerCase();
      pedidos = pedidos.filter(p => (p.comprador_nombre||'').toLowerCase().includes(q) || (p.ticket||'').toLowerCase().includes(q) || (p.comprador_email||'').toLowerCase().includes(q));
    }
    // Badge de pendientes
    const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
    if (badgePedidos) { badgePedidos.textContent = pendientes || ''; badgePedidos.style.display = pendientes ? '' : 'none'; }

    renderPedidos(pedidos);
  }

  function renderPedidos(lista) {
    if (!listaPedidos) return;
    if (!lista.length) {
      if (emptyPedidos) emptyPedidos.style.display = '';
      listaPedidos.innerHTML = '';
      return;
    }
    if (emptyPedidos) emptyPedidos.style.display = 'none';
    listaPedidos.innerHTML = '';

    lista.forEach(ped => {
      const total = (ped.items || []).reduce((s, i) => s + i.precio_unit * i.cantidad, 0);
      const div = document.createElement('div');
      div.style.cssText = 'background:#fff;border-radius:14px;padding:18px;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:12px';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;color:#C8601A">${ped.ticket || '#' + ped.id?.slice(-6)}</div>
            <div style="font-size:.82rem;color:#888">${formatFecha(ped.created_at)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${badgeEstado(ped.estado)}
            <select class="sel-estado" data-id="${ped.id}" style="padding:5px 8px;border-radius:8px;border:1px solid #ddd;font-size:.83rem;cursor:pointer">
              ${['pendiente','confirmado','listo','entregado','cancelado'].map(e =>
                `<option value="${e}" ${ped.estado===e?'selected':''}>${cap(e)}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div style="font-size:.88rem;margin-bottom:8px">
          <strong>${ped.comprador_nombre}</strong>
          <span style="color:#888;margin-left:8px">${ped.comprador_email}</span>
          ${ped.comprador_tel ? `<span style="color:#888;margin-left:8px">📞 ${ped.comprador_tel}</span>` : ''}
        </div>
        <div style="font-size:.83rem;margin-bottom:10px">
          ${(ped.items||[]).map(i=>`<div style="padding:3px 0;border-bottom:1px solid #f5efe5">${i.nombre} (${i.tipo_precio}) × ${i.cantidad} = ${formatPrecio(i.precio_unit*i.cantidad)}</div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:700">
          <span>Medio: ${cap(ped.medio_pago||'')}</span>
          <span style="color:#C8601A">Total: ${formatPrecio(total)}</span>
        </div>
        ${ped.notas ? `<div style="margin-top:6px;font-size:.8rem;color:#888">📝 ${ped.notas}</div>` : ''}
      `;

      div.querySelector('.sel-estado').addEventListener('change', async function () {
        const r2 = await api('api/pedidos.php?action=cambiar-estado', { method: 'POST', body: { id: ped.id, estado: this.value } });
        if (!r2.ok) { toast(r2.error || 'Error al cambiar estado', 'error'); return; }
        ped.estado = this.value;
        div.querySelector('[style*="badge"]') && (div.innerHTML = div.innerHTML); // simple refresh
        toast('Estado actualizado ✓', 'ok');
      });

      listaPedidos.appendChild(div);
    });
  }

  // ── PERFIL DE PANADERÍA ───────────────────────────────────────────────────
  const btnGuardarPerfil   = document.getElementById('btn-guardar-perfil');
  const pfPagoTransferencia = document.getElementById('pf-pago-transferencia');
  const pfTransferenciaDatos = document.getElementById('pf-transferencia-datos');
  const pfAvatarFile       = document.getElementById('pf-avatar-file');
  let urlAvatar = '';

  if (pfPagoTransferencia && pfTransferenciaDatos) {
    pfPagoTransferencia.addEventListener('change', () => {
      pfTransferenciaDatos.style.display = pfPagoTransferencia.checked ? '' : 'none';
    });
  }

  async function cargarPerfil() {
    const r = await api('api/panaderias.php?action=mi-perfil');
    if (!r.ok || !r.data) return;
    const pan = r.data;
    _val('pf-panaderia', pan.nombre);
    _val('pf-desc',      pan.descripcion);
    _val('pf-ig',        pan.instagram);
    _val('pf-tel',       pan.telefono);
    _val('pf-email',     pan.email || u.email);
    _val('pf-nombre',    pan.nombre || u.nombre);
    _val('pf-banner',    pan.banner_url);
    _val('pf-alias',     pan.cbu_alias);
    _val('pf-cbu',       pan.cbu);
    _val('pf-titular',   pan.titular_cbu);
    _chk('pf-pago-transferencia', pan.acepta_transferencia);
    _chk('pf-pago-debito',        pan.acepta_debito);
    _chk('pf-pago-credito',       pan.acepta_credito || pan.acepta_tarjeta);
    urlAvatar = pan.avatar_url || '';
    if (pfTransferenciaDatos) pfTransferenciaDatos.style.display = pan.acepta_transferencia ? '' : 'none';

    // Avatar preview
    const pfAvatarPreview = document.getElementById('pf-avatar-preview');
    if (pfAvatarPreview && pan.avatar_url) { pfAvatarPreview.src = pan.avatar_url; pfAvatarPreview.style.display = ''; }
  }

  function _chk(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  if (pfAvatarFile) {
    const pfAvatarPreview = document.getElementById('pf-avatar-preview');
    conectarUpload(pfAvatarFile, pfAvatarPreview, 'avatar', url => { urlAvatar = url; });
  }

  if (btnGuardarPerfil) {
    btnGuardarPerfil.addEventListener('click', async () => {
      const nombre = document.getElementById('pf-panaderia')?.value.trim() || document.getElementById('pf-nombre')?.value.trim() || '';
      setLoading(btnGuardarPerfil, true);
      const r = await api('api/panaderias.php?action=editar', {
        method: 'POST',
        body: {
          nombre,
          descripcion:          document.getElementById('pf-desc')?.value.trim()     || null,
          instagram:            document.getElementById('pf-ig')?.value.trim()       || null,
          telefono:             document.getElementById('pf-tel')?.value.trim()       || null,
          banner_url:           document.getElementById('pf-banner')?.value.trim()   || null,
          cbu_alias:            document.getElementById('pf-alias')?.value.trim()    || null,
          cbu:                  document.getElementById('pf-cbu')?.value.trim()      || null,
          titular_cbu:          document.getElementById('pf-titular')?.value.trim()  || null,
          acepta_transferencia: document.getElementById('pf-pago-transferencia')?.checked ? 1 : 0,
          acepta_debito:        document.getElementById('pf-pago-debito')?.checked   ? 1 : 0,
          acepta_credito:       document.getElementById('pf-pago-credito')?.checked  ? 1 : 0,
          avatar_url:           urlAvatar || null,
        }
      });
      setLoading(btnGuardarPerfil, false, 'Guardar cambios');
      if (!r.ok) { toast(r.error || 'Error al guardar', 'error'); return; }
      toast('Perfil actualizado ✓', 'ok');
    });
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────
  await Promise.all([cargarStats(), cargarProductos(), cargarPedidos(), cargarPerfil()]);

})();
