import { toast, formatPrecio, getIniciales } from './utils.js'
import { requireAuth, logout } from './auth.js'
import { subirImagen } from './upload.js'

let uid = null
let perfil = null
let misProds = []
let fotosExtra = []

let todosPedidosCache = []
let filtroPedidoEstado = 'todos'
let busqPedidos = ''

// ══ NOTIFICACIONES ══
const TITULO_ORIGINAL = document.title
let tituloFlashInterval = null

function reproducirSonidoPedido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.start(); osc.stop(ctx.currentTime + 0.5)
  } catch (e) { /* sin soporte */ }
}

function iniciarFlashTitulo() {
  if (tituloFlashInterval) return
  let on = false
  tituloFlashInterval = setInterval(() => {
    document.title = on ? TITULO_ORIGINAL : '🛎️ ¡Nuevo pedido!'
    on = !on
  }, 1000)
}

function detenerFlashTitulo() {
  if (tituloFlashInterval) { clearInterval(tituloFlashInterval); tituloFlashInterval = null }
  document.title = TITULO_ORIGINAL
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) detenerFlashTitulo()
})

// ══ POLLING ══
let ultimoPedidoId = null
let pollingInterval = null

function iniciarPolling() {
  pollingInterval = setInterval(async () => {
    const res = await fetch('api/pedidos.php?action=del_vendedor')
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return

    const ultimo = data[0]
    if (ultimoPedidoId && ultimo.id !== ultimoPedidoId) {
      const ticketRef = ultimo.ticket_id || '#' + ultimo.id.slice(-6).toUpperCase()
      toast(`🛎️ ¡Nuevo pedido! ${ticketRef}`, 'ok')
      reproducirSonidoPedido()
      if (document.hidden) iniciarFlashTitulo()

      const badge = document.getElementById('badge-pedidos')
      if (badge) {
        badge.textContent = parseInt(badge.textContent || '0') + 1
        badge.style.display = 'flex'
      }

      cargarStats()
      const secPedidos = document.getElementById('sec-pedidos')
      if (secPedidos && secPedidos.style.display !== 'none') {
        todosPedidosCache = data
        renderPedidosFiltrados()
      }
    }
    ultimoPedidoId = ultimo.id
  }, 15000)
}

// ══ INIT ══
async function init() {
  const session = await requireAuth('vendedor')
  if (!session) return
  uid = session.user.id
  perfil = session.perfil

  document.getElementById('dash-sub').textContent =
    `Bienvenido/a, ${perfil.nombre.split(' ')[0]} 👋`

  cargarStats()
  cargarUltimos()
  cargarMisProductos()
  rellenarPerfil()
  initEventos()
  iniciarPolling()
  initDocumentos()
  initSucursales()

  const res = await fetch(`api/productos.php?action=por_vendedor&vendedor_id=${uid}`)
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) mostrarOnboarding()

  const r2 = await fetch('api/pedidos.php?action=del_vendedor')
  const d2 = await r2.json()
  if (Array.isArray(d2) && d2.length > 0) ultimoPedidoId = d2[0].id
}

function mostrarOnboarding() {
  const el = document.getElementById('onboarding')
  if (el) el.style.display = 'block'
}

// ══ NAVEGACIÓN ══
const TITULOS = {
  inicio: 'Mi Panel',
  productos: 'Mis Productos',
  agregar: 'Agregar Producto',
  pedidos: 'Pedidos',
  perfil: 'Mi Perfil',
  documentos: 'Mis Documentos',
  sucursales: 'Mis Sucursales'
}

function mostrarSec(nombre) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none')
  const sec = document.getElementById(`sec-${nombre}`)
  if (sec) sec.style.display = 'block'
  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('on', l.dataset.sec === nombre))
  document.getElementById('dash-titulo').textContent = TITULOS[nombre] || ''
  cerrarSidebar()
  if (nombre === 'pedidos') {
    cargarPedidos()
    const badge = document.getElementById('badge-pedidos')
    if (badge) badge.style.display = 'none'
  }
  if (nombre === 'sucursales') cargarSucursales()
}

function cerrarSidebar() {
  document.getElementById('sidebar').classList.remove('open')
  document.getElementById('sidebar-overlay').classList.remove('open')
}

// ══ EVENTOS ══
function initEventos() {
  document.querySelectorAll('.nav-link').forEach(l =>
    l.addEventListener('click', e => { e.preventDefault(); mostrarSec(l.dataset.sec) }))

  document.getElementById('btn-ir-agregar').addEventListener('click', () => mostrarSec('agregar'))
  document.getElementById('btn-logout').addEventListener('click', e => { e.preventDefault(); logout() })

  document.getElementById('mob-menu').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open')
    document.getElementById('sidebar-overlay').classList.add('open')
  })
  document.getElementById('sidebar-overlay').addEventListener('click', cerrarSidebar)

  document.getElementById('p-img-file').addEventListener('change', e => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Debe ser una imagen', 'err'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Máx 5MB', 'err'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const prev = document.getElementById('img-preview')
      prev.src = ev.target.result; prev.style.display = 'block'
    }
    reader.readAsDataURL(file)
    window._imgFile = file
    document.getElementById('p-img-url').value = ''
  })

  document.getElementById('p-img-url').addEventListener('input', e => {
    const url = e.target.value.trim()
    const prev = document.getElementById('img-preview')
    window._imgFile = null
    if (url) { prev.src = url; prev.style.display = 'block' }
    else prev.style.display = 'none'
  })

  document.getElementById('p-fotos-extra').addEventListener('change', e => {
    const files = Array.from(e.target.files).slice(0, 4)
    fotosExtra = files
    const prev = document.getElementById('fotos-extra-preview')
    prev.innerHTML = ''
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => {
        const img = document.createElement('img')
        img.src = ev.target.result
        img.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:8px;border:2px solid var(--crema-dark)'
        prev.appendChild(img)
      }
      reader.readAsDataURL(f)
    })
  })

  document.getElementById('pf-avatar-file').addEventListener('change', async e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('Máx 2MB', 'err'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      document.getElementById('avatar-preview').innerHTML =
        `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover">`
    }
    reader.readAsDataURL(file)
    toast('Subiendo foto...', 'inf')
    const url = await subirImagen(file, uid, 'avatares')
    if (!url) { toast('Error al subir foto', 'err'); return }
    await fetch('api/profiles.php?action=actualizar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: url })
    })
    toast('Foto actualizada ✓', 'ok')
  })

  document.getElementById('btn-guardar').addEventListener('click', guardarProducto)
  document.getElementById('btn-cancelar').addEventListener('click', () => {
    resetForm(); mostrarSec('productos')
  })
  document.getElementById('btn-guardar-perfil').addEventListener('click', guardarPerfil)

  document.getElementById('p-unidad').addEventListener('change', e => {
    const esKilo = e.target.value === 'kilo'
    const campos = document.getElementById('campos-docena')
    const hint = document.getElementById('label-precio-hint')
    const labelEl = document.getElementById('label-precio-completo')
    const hintK = document.getElementById('hint-kilo')
    const inputP = document.getElementById('p-precio')
    if (campos) campos.style.display = esKilo ? 'none' : 'grid'
    if (hint) hint.textContent = esKilo ? '(precio por kg)' : '(por unidad)'
    if (labelEl) labelEl.textContent = esKilo ? 'Precio por KG *' : 'Precio *'
    if (hintK) hintK.style.display = esKilo ? 'block' : 'none'
    if (inputP) {
      inputP.placeholder = esKilo ? 'Ej: 2500 (= $2.500 x 1kg)' : '0'
      inputP.step = esKilo ? '100' : '50'
    }
  })

  document.getElementById('ob-ir-perfil')?.addEventListener('click', () => mostrarSec('perfil'))
  document.getElementById('ob-ir-agregar')?.addEventListener('click', () => mostrarSec('agregar'))
  document.getElementById('ob-cerrar')?.addEventListener('click', () => {
    document.getElementById('onboarding').style.display = 'none'
  })

  document.getElementById('mp-transferencia')?.addEventListener('change', e => {
    const camposTransf = document.getElementById('campos-transferencia')
    if (camposTransf) camposTransf.style.display = e.target.checked ? 'block' : 'none'
  })

  document.querySelectorAll('#filtros-pedidos .filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtros-pedidos .filtro').forEach(b => b.classList.remove('on'))
      btn.classList.add('on')
      filtroPedidoEstado = btn.dataset.estado
      renderPedidosFiltrados()
    })
  })

  document.getElementById('buscar-pedidos')?.addEventListener('input', e => {
    busqPedidos = e.target.value
    renderPedidosFiltrados()
  })
}

// ══ STATS ══
async function cargarStats() {
  const res = await fetch(`api/productos.php?action=por_vendedor&vendedor_id=${uid}`)
  const prods = await res.json()
  const activos = Array.isArray(prods) ? prods.filter(p => p.activo == 1).length : 0
  document.getElementById('st-activos').textContent = activos
  document.getElementById('st-total').textContent = Array.isArray(prods) ? prods.length : 0

  const res2 = await fetch('api/pedidos.php?action=del_vendedor')
  const peds = await res2.json()
  const pendientes = Array.isArray(peds) ? peds.filter(p => p.estado === 'pendiente').length : 0
  document.getElementById('st-pedidos').textContent = pendientes
}

// ══ ÚLTIMOS PEDIDOS ══
async function cargarUltimos() {
  const res = await fetch('api/pedidos.php?action=del_vendedor')
  const data = await res.json()
  const el = document.getElementById('ultimos-pedidos')
  if (!Array.isArray(data) || data.length === 0) {
    el.innerHTML = '<p style="color:var(--gris)">Aún no recibiste pedidos</p>'
    return
  }
  el.innerHTML = data.slice(0, 5).map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:11px 0;border-bottom:1px solid var(--crema-dark)">
      <div>
        <div style="font-weight:700">${p.ticket_id || '#' + p.id.slice(-6).toUpperCase()}</div>
        <div style="font-size:0.8rem;color:var(--gris)">
          ${new Date(p.created_at).toLocaleDateString('es-AR')}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:var(--verde)">${formatPrecio(p.total)}</div>
        <span class="estado-badge estado-${p.estado}">${p.estado}</span>
      </div>
    </div>
  `).join('')
}

// ══ MIS PRODUCTOS ══
async function cargarMisProductos() {
  const res = await fetch(`api/productos.php?action=por_vendedor&vendedor_id=${uid}`)
  const data = await res.json()
  misProds = Array.isArray(data) ? data : []
  renderTabla()
}

function renderTabla() {
  const tbody = document.getElementById('tbody-productos')
  if (misProds.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:36px;color:var(--gris)">
        No tenés productos todavía.
        <a href="#" onclick="event.preventDefault();
           document.querySelector('[data-sec=agregar]').click()"
           style="color:var(--naranja);font-weight:700">Agregá uno →</a>
      </td></tr>`
    return
  }

  tbody.innerHTML = misProds.map(p => `
    <tr data-id="${p.id}" ${!p.activo || p.cantidad_disponible === 0 ? 'style="opacity:0.6"' : ''}>
      <td class="td-nombre">
        <div style="display:flex;align-items:center;gap:10px">
          ${p.imagen_url
      ? `<img src="${p.imagen_url}"
                    style="width:38px;height:38px;border-radius:6px;object-fit:cover">`
      : `<div style="width:38px;height:38px;border-radius:6px;
                            background:var(--crema-dark);display:flex;
                            align-items:center;justify-content:center;font-size:1.1rem">
                 ${catEmoji(p.categoria)}</div>`}
          <div>
            <div>${p.nombre}</div>
            <div style="font-size:0.75rem;color:var(--gris)">
              ${p.unidad_venta === 'kilo' ? '⚖️ Por kilo' : '📦 Por unidad'}
              ${p.cantidad_disponible == 0
      ? ' · <span style="color:var(--rojo)">Sin stock</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-${p.categoria || 'otro'}">${p.categoria || 'otro'}</span></td>
      <td class="td-precio">
        ${formatPrecio(p.precio)}
        <span style="font-size:0.72rem;color:var(--gris)">
          ${p.unidad_venta === 'kilo' ? '/kg' : '/u'}
        </span>
      </td>
      <td>${p.cantidad_disponible ?? '—'}</td>
      <td>
        <button class="toggle-estado ${p.activo == 1 ? 'activo' : 'inactivo'}"
                data-id="${p.id}" data-activo="${p.activo}">
          ${p.activo == 1 ? '✓ Activo' : '✗ Inactivo'}
        </button>
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm btn-editar"
                  data-id="${p.id}" aria-label="Editar">✏️</button>
          <button class="btn btn-danger btn-sm btn-eliminar"
                  data-id="${p.id}" aria-label="Eliminar">🗑</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('.toggle-estado').forEach(btn => {
    btn.addEventListener('click', async () => {
      const nuevo = btn.dataset.activo == '1' ? 0 : 1
      const res = await fetch('api/productos.php?action=actualizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: btn.dataset.id, activo: nuevo })
      })
      const data = await res.json()
      if (data.error) { toast('Error al actualizar', 'err'); return }
      btn.dataset.activo = nuevo
      btn.className = `toggle-estado ${nuevo == 1 ? 'activo' : 'inactivo'}`
      btn.textContent = nuevo == 1 ? '✓ Activo' : '✗ Inactivo'
      toast(nuevo == 1 ? 'Producto activado' : 'Producto desactivado', 'ok')
      cargarStats()
    })
  })

  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = misProds.find(x => x.id === btn.dataset.id)
      if (!p) return
      document.getElementById('edit-id').value = p.id
      document.getElementById('p-nombre').value = p.nombre
      document.getElementById('p-cat').value = p.categoria || ''
      document.getElementById('p-unidad').value = p.unidad_venta || 'unidad'
      document.getElementById('p-desc').value = p.descripcion || ''
      document.getElementById('p-precio').value = p.precio
      document.getElementById('p-media-doc').value = p.precio_media_docena || ''
      document.getElementById('p-docena').value = p.precio_docena || ''
      document.getElementById('p-stock').value = p.cantidad_disponible || 0
      document.getElementById('p-extra').value = p.dato_extra || ''
      document.getElementById('p-img-url').value = p.imagen_url || ''
      const campos = document.getElementById('campos-docena')
      if (campos) campos.style.display = p.unidad_venta === 'kilo' ? 'none' : 'grid'
      const prev = document.getElementById('img-preview')
      if (p.imagen_url) { prev.src = p.imagen_url; prev.style.display = 'block' }
      else prev.style.display = 'none'
      window._imgFile = null
      document.getElementById('form-titulo').textContent = '✏️ Editar Producto'
      document.getElementById('btn-cancelar').style.display = 'inline-flex'
      mostrarSec('agregar')
    })
  })

  tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este producto?')) return
      const res = await fetch('api/productos.php?action=eliminar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: btn.dataset.id })
      })
      const data = await res.json()
      if (data.error) { toast('Error al eliminar', 'err'); return }
      misProds = misProds.filter(p => p.id !== btn.dataset.id)
      renderTabla(); cargarStats()
      toast('Producto eliminado', 'ok')
    })
  })
}

// ══ GUARDAR PRODUCTO ══
async function guardarProducto() {
  const editId = document.getElementById('edit-id').value
  const nombre = document.getElementById('p-nombre').value.trim()
  const cat = document.getElementById('p-cat').value
  const unidad = document.getElementById('p-unidad').value
  const precio = parseFloat(document.getElementById('p-precio').value)

  if (!nombre || !cat || !precio) {
    toast('Completá nombre, categoría y precio', 'err'); return
  }

  const btn = document.getElementById('btn-guardar')
  btn.disabled = true; btn.textContent = 'Guardando...'

  let imagenUrl = document.getElementById('p-img-url').value.trim() || null
  if (window._imgFile) {
    toast('Subiendo imagen...', 'inf')
    const url = await subirImagen(window._imgFile, uid)
    if (!url) {
      toast('Error al subir imagen', 'err')
      btn.disabled = false; btn.textContent = '💾 Guardar producto'; return
    }
    imagenUrl = url; window._imgFile = null
  }

  const payload = {
    nombre, categoria: cat, unidad_venta: unidad,
    descripcion: document.getElementById('p-desc').value.trim() || null,
    precio,
    precio_media_docena: unidad === 'kilo' ? null : parseFloat(document.getElementById('p-media-doc').value) || null,
    precio_docena: unidad === 'kilo' ? null : parseFloat(document.getElementById('p-docena').value) || null,
    cantidad_disponible: parseInt(document.getElementById('p-stock').value) || 0,
    dato_extra: document.getElementById('p-extra').value.trim() || null,
    imagen_url: imagenUrl, activo: 1,
  }

  if (editId) payload.id = editId

  const res = await fetch(`api/productos.php?action=${editId ? 'actualizar' : 'crear'}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()

  btn.disabled = false; btn.textContent = '💾 Guardar producto'
  if (data.error) { toast('Error: ' + data.error, 'err'); return }

  const savedId = editId || data.id || null

  if (fotosExtra.length > 0 && savedId) {
    for (let i = 0; i < fotosExtra.length; i++) {
      const url = await subirImagen(fotosExtra[i], uid)
      if (url) {
        await fetch('api/fotos.php?action=agregar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ producto_id: savedId, url, orden: i })
        })
      }
    }
    fotosExtra = []
    document.getElementById('fotos-extra-preview').innerHTML = ''
    document.getElementById('p-fotos-extra').value = ''
  }

  document.getElementById('onboarding').style.display = 'none'
  toast(editId ? 'Producto actualizado ✓' : '¡Producto publicado! 🎉', 'ok')
  resetForm()
  await cargarMisProductos()
  await cargarStats()
  mostrarSec('productos')
}

function resetForm() {
  ['edit-id', 'p-nombre', 'p-desc', 'p-precio', 'p-media-doc',
    'p-docena', 'p-stock', 'p-extra', 'p-img-url'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = ''
    })
  document.getElementById('p-cat').value = ''
  document.getElementById('p-unidad').value = 'unidad'
  document.getElementById('p-img-file').value = ''
  document.getElementById('img-preview').style.display = 'none'
  document.getElementById('form-titulo').textContent = '➕ Agregar Producto'
  document.getElementById('btn-cancelar').style.display = 'none'
  const campos = document.getElementById('campos-docena')
  if (campos) campos.style.display = 'grid'
  fotosExtra = []; window._imgFile = null
  document.getElementById('fotos-extra-preview').innerHTML = ''
  document.getElementById('p-fotos-extra').value = ''
}

// ══ PEDIDOS ══
async function cargarPedidos() {
  const res = await fetch('api/pedidos.php?action=del_vendedor')
  const data = await res.json()
  todosPedidosCache = Array.isArray(data) ? data : []
  renderPedidosFiltrados()
}

function renderPedidosFiltrados() {
  let lista = todosPedidosCache

  if (filtroPedidoEstado !== 'todos') {
    lista = lista.filter(p => p.estado === filtroPedidoEstado)
  }
  if (busqPedidos.trim()) {
    const q = busqPedidos.toLowerCase()
    lista = lista.filter(p =>
      (p.ticket_id || '').toLowerCase().includes(q) ||
      (p.nombre_comprador || '').toLowerCase().includes(q)
    )
  }

  const el = document.getElementById('lista-pedidos')
  const empty = document.getElementById('empty-pedidos')

  if (todosPedidosCache.length === 0) {
    el.innerHTML = '<p style="color:var(--gris)">Aún no recibiste pedidos</p>'
    if (empty) empty.style.display = 'none'
    return
  }
  if (lista.length === 0) {
    el.innerHTML = ''
    if (empty) empty.style.display = 'block'
    return
  }
  if (empty) empty.style.display = 'none'

  el.innerHTML = lista.map(p => {
    let items = []
    try { items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items } catch (e) { }
    return `
    <div class="pedido-card">
      <div class="pedido-top">
        <div>
          <div class="pedido-id">
            ${p.ticket_id || '#' + p.id.slice(-6).toUpperCase()}
          </div>
          <div class="pedido-fecha">
            ${new Date(p.created_at).toLocaleString('es-AR')}
            ${p.nombre_comprador ? '· ' + p.nombre_comprador : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="estado-badge estado-${p.estado}">${p.estado}</span>
          <select onchange="window._cambiarEstado('${p.id}', this.value)"
                  style="width:auto;margin:0;font-size:0.82rem;padding:5px 10px">
            <option value="pendiente"  ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="confirmado" ${p.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
            <option value="listo"      ${p.estado === 'listo' ? 'selected' : ''}>Listo</option>
            <option value="entregado"  ${p.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
          </select>
        </div>
      </div>
      ${(items || []).map(i => `
        <div class="pedido-item">
          <span>${i.nombre} × ${i.cantidad}</span>
          <span style="font-weight:700">${formatPrecio(i.precio * i.cantidad)}</span>
        </div>
      `).join('')}
      <div class="pedido-total">
        <span>Total</span><span>${formatPrecio(p.total)}</span>
      </div>
      ${p.notas ? `
        <div style="margin-top:10px;font-size:0.82rem;background:white;
                    padding:8px 12px;border-radius:6px">
          📝 ${p.notas}
        </div>` : ''}
    </div>`
  }).join('')
}

window._cambiarEstado = async (id, estado) => {
  const res = await fetch('api/pedidos.php?action=estado', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, estado })
  })
  const data = await res.json()
  if (data.error) { toast('Error al actualizar estado', 'err'); return }
  toast(`Estado: ${estado}`, 'ok')
  const idx = todosPedidosCache.findIndex(p => p.id === id)
  if (idx >= 0) todosPedidosCache[idx].estado = estado
  renderPedidosFiltrados()
  cargarStats()
}

// ══ PERFIL ══
function rellenarPerfil() {
  document.getElementById('pf-nombre').value = perfil.nombre || ''
  document.getElementById('pf-panaderia').value = perfil.nombre_panaderia || ''
  document.getElementById('pf-desc').value = perfil.descripcion || ''
  document.getElementById('pf-ig').value = perfil.instagram || ''
  document.getElementById('pf-tel').value = perfil.telefono || ''
  document.getElementById('pf-email').value = perfil.email_contacto || ''
  document.getElementById('pf-banner').value = perfil.banner_anuncio || ''
  document.getElementById('pf-cbu').value = perfil.cbu || ''
  document.getElementById('pf-alias').value = perfil.alias_cbu || ''
  document.getElementById('pf-titular').value = perfil.titular_cuenta || ''

  const medios = perfil.medios_pago
    ? (typeof perfil.medios_pago === 'string'
      ? JSON.parse(perfil.medios_pago) : perfil.medios_pago)
    : ['efectivo']

    ;['efectivo', 'transferencia', 'debito', 'credito'].forEach(m => {
      const el = document.getElementById(`mp-${m}`)
      if (el) el.checked = medios.includes(m)
    })

  const camposTransf = document.getElementById('campos-transferencia')
  if (camposTransf) {
    camposTransf.style.display = medios.includes('transferencia') ? 'block' : 'none'
  }

  const avatarEl = document.getElementById('avatar-preview')
  if (perfil.avatar_url) {
    avatarEl.innerHTML =
      `<img src="${perfil.avatar_url}" style="width:100%;height:100%;object-fit:cover">`
  } else {
    avatarEl.textContent = getIniciales(perfil.nombre_panaderia || perfil.nombre)
  }
}

async function guardarPerfil() {
  const btn = document.getElementById('btn-guardar-perfil')
  btn.disabled = true; btn.textContent = 'Guardando...'

  const medios = ['efectivo', 'transferencia', 'debito', 'credito']
    .filter(m => document.getElementById(`mp-${m}`)?.checked)

  if (medios.includes('transferencia')) {
    const cbu = document.getElementById('pf-cbu').value.trim()
    const alias = document.getElementById('pf-alias').value.trim()
    if (!cbu && !alias) {
      toast('Para transferencias ingresá al menos el CBU o alias', 'err')
      btn.disabled = false; btn.textContent = 'Guardar cambios'; return
    }
  }

  const res = await fetch('api/profiles.php?action=actualizar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: document.getElementById('pf-nombre').value.trim(),
      nombre_panaderia: document.getElementById('pf-panaderia').value.trim(),
      descripcion: document.getElementById('pf-desc').value.trim(),
      instagram: document.getElementById('pf-ig').value.trim(),
      telefono: document.getElementById('pf-tel').value.trim(),
      email_contacto: document.getElementById('pf-email').value.trim(),
      banner_anuncio: document.getElementById('pf-banner').value.trim() || null,
      cbu: document.getElementById('pf-cbu').value.trim() || null,
      alias_cbu: document.getElementById('pf-alias').value.trim() || null,
      titular_cuenta: document.getElementById('pf-titular').value.trim() || null,
      medios_pago: medios,
    })
  })
  const data = await res.json()
  btn.disabled = false; btn.textContent = 'Guardar cambios'
  if (data.error) { toast('Error al guardar', 'err'); return }
  toast('Perfil actualizado ✓', 'ok')
}

function catEmoji(c) {
  return { pan: '🍞', facturas: '🥐', galletas: '🍪', cakes: '🎂', otro: '✨' }[c] || '🛒'
}

// ══ DOCUMENTOS ══
let docsPendientes = { doc1: null, doc2: null, doc3: null }

function initDocumentos() {
  cargarEstadoDocs()

    ;[
      { inputId: 'file-doc-1', key: 'doc1', previewId: 'preview-doc-1', icoId: 'ico-doc-1' },
      { inputId: 'file-doc-2', key: 'doc2', previewId: 'preview-doc-2', icoId: 'ico-doc-2' },
      { inputId: 'file-doc-3', key: 'doc3', previewId: 'preview-doc-3', icoId: 'ico-doc-3' },
    ].forEach(({ inputId, key, previewId, icoId }) => {
      document.getElementById(inputId)?.addEventListener('change', e => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { toast('Máx 5MB', 'err'); return }
        docsPendientes[key] = file
        const ico = document.getElementById(icoId)
        if (ico) ico.textContent = '✅'
        const prev = document.getElementById(previewId)
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = ev => {
            prev.innerHTML = `<img src="${ev.target.result}"
            style="width:100%;max-height:140px;object-fit:cover;
                   border-radius:8px;border:2px solid var(--crema-dark)">`
          }
          reader.readAsDataURL(file)
        } else {
          prev.innerHTML = `<div style="padding:12px;background:var(--crema);
          border-radius:8px;font-size:0.85rem">📄 ${file.name}</div>`
        }
      })
    })

  document.getElementById('btn-subir-docs')?.addEventListener('click', subirDocumentos)
}

async function cargarEstadoDocs() {
  const res = await fetch(`api/profiles.php?action=get&id=${uid}`)
  const data = await res.json()
  if (data.error) return

  const estado = data.estado_verificacion || 'sin_enviar'
  const el = document.getElementById('docs-estado')
  if (el) {
    const labels = {
      sin_enviar: 'Sin documentos enviados',
      pendiente: '📋 Documentos enviados — En revisión',
      aprobado: '✅ Vendedor aprobado',
      rechazado: '❌ Documentos rechazados'
    }
    const colors = {
      sin_enviar: 'var(--gris)',
      pendiente: 'var(--naranja)',
      aprobado: 'var(--verde)',
      rechazado: '#C62828'
    }
    el.textContent = labels[estado] || estado
    el.style.color = colors[estado] || 'var(--gris)'
  }

  if (data.doc_notas_rechazo) {
    const wrap = document.getElementById('docs-nota-wrap')
    const nota = document.getElementById('docs-nota-rechazo')
    if (wrap) wrap.style.display = 'block'
    if (nota) nota.textContent = data.doc_notas_rechazo
  }

  ;['doc_bromatologia', 'doc_carnet_manipulador', 'doc_habilitacion_comercial']
    .forEach((campo, i) => {
      if (data[campo]) {
        const ico = document.getElementById(`ico-doc-${i + 1}`)
        if (ico) ico.textContent = '✅'
      }
    })
}

async function subirDocumentos() {
  const btn = document.getElementById('btn-subir-docs')
  if (!docsPendientes.doc1 && !docsPendientes.doc2 && !docsPendientes.doc3) {
    toast('Seleccioná al menos un documento', 'err'); return
  }
  btn.disabled = true; btn.textContent = 'Subiendo...'

  const payload = {}
  if (docsPendientes.doc1) {
    const url = await subirImagen(docsPendientes.doc1, uid, 'documentos')
    if (url) payload.doc_bromatologia = url
  }
  if (docsPendientes.doc2) {
    const url = await subirImagen(docsPendientes.doc2, uid, 'documentos')
    if (url) payload.doc_carnet_manipulador = url
  }
  if (docsPendientes.doc3) {
    const url = await subirImagen(docsPendientes.doc3, uid, 'documentos')
    if (url) payload.doc_habilitacion_comercial = url
  }

  if (Object.keys(payload).length === 0) {
    toast('Error al subir archivos', 'err')
    btn.disabled = false; btn.textContent = '📤 Enviar documentos'; return
  }

  const res = await fetch('api/profiles.php?action=guardar_docs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  btn.disabled = false; btn.textContent = '📤 Enviar documentos para revisión'

  if (data.error) { toast('Error al guardar documentos', 'err'); return }
  toast('Documentos enviados para revisión 📋', 'ok')
  docsPendientes = { doc1: null, doc2: null, doc3: null }
  cargarEstadoDocs()
}

// ══ SUCURSALES ══
function initSucursales() {
  initEventosSucursales()
}

async function cargarSucursales() {
  const res = await fetch('api/profiles.php?action=listar_sucursales')
  const data = await res.json()
  cargarMetricasGrupo(Array.isArray(data) ? data : [])
  renderSucursales(Array.isArray(data) ? data : [])
}

async function cargarMetricasGrupo(sucursales) {
  const el = document.getElementById('metricas-grupo')
  if (!sucursales || sucursales.length === 0) {
    if (el) el.style.display = 'none'
    return
  }
  if (el) el.style.display = 'block'

  const ids = [uid, ...sucursales.map(s => s.id)]
  let totalVentas = 0, totalPedidos = 0, totalProductos = 0

  for (const id of ids) {
    const res = await fetch(`api/profiles.php?action=metricas_sucursal&sucursal_id=${id}`)
    const data = await res.json()
    if (!data.error) {
      totalVentas += (data.pedidos || []).reduce((a, p) => a + parseFloat(p.total || 0), 0)
      totalPedidos += (data.pedidos || []).length
      totalProductos += data.total_prods || 0
    }
  }

  const elV = document.getElementById('grupo-ventas')
  const elP = document.getElementById('grupo-pedidos')
  const elPr = document.getElementById('grupo-productos')
  if (elV) elV.textContent = formatPrecio(totalVentas)
  if (elP) elP.textContent = totalPedidos
  if (elPr) elPr.textContent = totalProductos
}

function renderSucursales(sucursales) {
  const el = document.getElementById('lista-sucursales')
  const empty = document.getElementById('empty-sucursales')
  if (!el) return

  if (!sucursales || sucursales.length === 0) {
    el.innerHTML = ''
    if (empty) empty.style.display = 'block'
    return
  }
  if (empty) empty.style.display = 'none'

  el.innerHTML = sucursales.map(s => `
    <div class="vendedor-card" style="margin-bottom:12px">
      <div class="vendedor-card-header" style="display:flex;align-items:center;
           gap:14px;padding:16px 20px">
        <div class="vendedor-avatar"
             style="width:44px;height:44px;border-radius:50%;
                    background:var(--naranja);display:flex;
                    align-items:center;justify-content:center;
                    font-weight:900;color:white;font-size:1rem;
                    overflow:hidden;flex-shrink:0">
          ${s.avatar_url
      ? `<img src="${s.avatar_url}"
                    style="width:100%;height:100%;object-fit:cover">`
      : getIniciales(s.nombre_panaderia || s.nombre || '?')}
        </div>
        <div style="flex:1">
          <div style="font-weight:700">${s.nombre_panaderia || s.nombre}</div>
          <div style="font-size:0.8rem;color:var(--gris)">${s.email_contacto || '—'}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm"
                  onclick="window.verDetalleSucursal('${s.id}','${(s.nombre_panaderia || s.nombre).replace(/'/g, "\\'")}')">
            📊 Métricas
          </button>
          <button class="btn btn-sm" style="background:#C62828;color:white;border:none"
                  onclick="window.desvincularSucursal('${s.id}')">
            Desvincular
          </button>
        </div>
      </div>
      <div id="detalle-suc-${s.id}"
           style="display:none;padding:18px 20px;
                  border-top:1px solid var(--crema-dark)"></div>
    </div>
  `).join('')
}

window.verDetalleSucursal = async (sucId, nombre) => {
  const el = document.getElementById(`detalle-suc-${sucId}`)
  if (!el) return
  if (el.style.display !== 'none') { el.style.display = 'none'; return }
  el.innerHTML = '<p style="color:var(--gris)">Cargando...</p>'
  el.style.display = 'block'

  const res = await fetch(`api/profiles.php?action=metricas_sucursal&sucursal_id=${sucId}`)
  const data = await res.json()
  if (data.error) { el.innerHTML = '<p style="color:var(--gris)">No se pudo cargar</p>'; return }

  const totalVentas = (data.pedidos || []).reduce((a, p) => a + parseFloat(p.total || 0), 0)
  const pendientes = (data.pedidos || []).filter(p => p.estado === 'pendiente').length
  const entregados = (data.pedidos || []).filter(p => p.estado === 'entregado').length

  el.innerHTML = `
    <h4 style="margin-bottom:12px;font-family:'Playfair Display',serif">
      📊 ${nombre}
    </h4>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
                gap:10px;margin-bottom:16px">
      <div class="stat-card-sm">
        <div class="lbl">Ventas totales</div>
        <div class="val">${formatPrecio(totalVentas)}</div>
      </div>
      <div class="stat-card-sm">
        <div class="lbl">Pedidos</div>
        <div class="val">${(data.pedidos || []).length}</div>
      </div>
      <div class="stat-card-sm">
        <div class="lbl">Pendientes</div>
        <div class="val" style="color:var(--naranja)">${pendientes}</div>
      </div>
      <div class="stat-card-sm">
        <div class="lbl">Entregados</div>
        <div class="val" style="color:var(--verde)">${entregados}</div>
      </div>
    </div>
    ${data.ultimos && data.ultimos.length > 0 ? `
      <div style="font-weight:700;margin-bottom:8px;font-size:0.88rem">
        Últimos pedidos:
      </div>
      ${data.ultimos.map(p => `
        <div style="display:flex;justify-content:space-between;
                    padding:8px 0;border-bottom:1px solid var(--crema-dark);
                    font-size:0.82rem">
          <span>${p.ticket_id || '#' + p.id.slice(-6).toUpperCase()}</span>
          <span class="estado-badge estado-${p.estado}">${p.estado}</span>
          <span style="font-weight:700;color:var(--verde)">${formatPrecio(p.total)}</span>
        </div>
      `).join('')}
    ` : '<p style="color:var(--gris);font-size:0.85rem">Sin pedidos aún</p>'}
  `
}

window.desvincularSucursal = async (sucId) => {
  if (!confirm('¿Desvincular esta sucursal? Seguirá existiendo como panadería independiente.')) return
  const res = await fetch('api/profiles.php?action=desvincular_sucursal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sucursal_id: sucId })
  })
  const data = await res.json()
  if (data.error) { toast('Error al desvincular', 'err'); return }
  toast('Sucursal desvinculada', 'ok')
  cargarSucursales()
}

function initEventosSucursales() {
  document.getElementById('btn-buscar-sucursal')?.addEventListener('click', async () => {
    const email = document.getElementById('input-buscar-sucursal').value.trim()
    if (!email) { toast('Ingresá un email', 'err'); return }

    const res = await fetch(`api/profiles.php?action=buscar_por_email&email=${encodeURIComponent(email)}`)
    const data = await res.json()
    const el = document.getElementById('resultado-busqueda-sucursal')

    if (data.error) {
      el.innerHTML = '<p style="color:var(--gris);font-size:0.85rem">No se encontró ninguna panadería con ese email.</p>'
      return
    }
    if (data.id === uid) {
      el.innerHTML = '<p style="color:#C62828;font-size:0.85rem">No podés vincularte a vos mismo.</p>'
      return
    }
    if (data.panaderia_padre_id) {
      el.innerHTML = '<p style="color:#C62828;font-size:0.85rem">Esta panadería ya está vinculada a otra panadería principal.</p>'
      return
    }

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;
                  background:var(--blanco);padding:12px;
                  border-radius:var(--radio);border:1px solid var(--crema-dark)">
        <div style="font-weight:700;flex:1">${data.nombre_panaderia || data.nombre}</div>
        <button class="btn btn-naranja btn-sm" id="btn-confirmar-vincular"
                data-id="${data.id}">
          Vincular como sucursal
        </button>
      </div>
    `
    document.getElementById('btn-confirmar-vincular').addEventListener('click', async () => {
      const res2 = await fetch('api/profiles.php?action=vincular_sucursal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursal_id: data.id })
      })
      const d2 = await res2.json()
      if (d2.error) { toast('Error al vincular', 'err'); return }
      toast('Sucursal vinculada ✓', 'ok')
      el.innerHTML = ''
      document.getElementById('input-buscar-sucursal').value = ''
      cargarSucursales()
    })
  })

  document.getElementById('btn-crear-sucursal')?.addEventListener('click', () => {
    const form = document.getElementById('form-crear-sucursal')
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none'
  })

  document.getElementById('btn-confirmar-crear-sucursal')?.addEventListener('click', async () => {
    const panaderia = document.getElementById('suc-nombre-pan').value.trim()
    const nombre = document.getElementById('suc-nombre').value.trim()
    const email = document.getElementById('suc-email').value.trim()
    const pass = document.getElementById('suc-pass').value

    if (!panaderia || !nombre || !email || !pass) {
      toast('Completá todos los campos', 'err'); return
    }
    if (pass.length < 8) { toast('Contraseña mínimo 8 caracteres', 'err'); return }

    const btn = document.getElementById('btn-confirmar-crear-sucursal')
    btn.disabled = true; btn.textContent = 'Creando...'

    const res = await fetch('api/profiles.php?action=crear_sucursal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, panaderia, email, password: pass })
    })
    const data = await res.json()
    btn.disabled = false; btn.textContent = 'Crear sucursal'

    if (data.error) { toast(data.error, 'err'); return }
    toast('¡Sucursal creada! 🎉', 'ok')
    document.getElementById('form-crear-sucursal').style.display = 'none'
      ;['suc-nombre-pan', 'suc-nombre', 'suc-email', 'suc-pass'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = ''
      })
    cargarSucursales()
  })
}

init()