import { toast } from './utils.js'
import { getUser } from './auth.js'

export async function renderEstrellas(productoId, containerId) {
  const el = document.getElementById(containerId)
  if (!el) return

  const res  = await fetch(`api/calificaciones.php?action=get&producto_id=${productoId}`)
  const data = await res.json()

  const total    = data.total    || 0
  const promedio = data.promedio || 0
  const miCal    = data.mi_cal  || 0
  const user     = await getUser()

  el.innerHTML = `
    <div class="estrellas-wrap" data-pid="${productoId}">
      <div class="estrellas-display" title="${promedio.toFixed(1)} / 5">
        ${renderStars(promedio)}
      </div>
      <span class="estrellas-count">
        ${total > 0 ? `${promedio.toFixed(1)} (${total})` : 'Sin calificaciones'}
      </span>
      ${user ? `
        <div class="estrellas-votar" title="Tu calificación">
          ${[1,2,3,4,5].map(n => `
            <button class="star-btn ${miCal >= n ? 'on' : ''}"
                    data-val="${n}" data-pid="${productoId}"
                    aria-label="${n} estrella${n > 1 ? 's' : ''}">★</button>
          `).join('')}
          ${miCal
            ? `<span style="font-size:0.72rem;color:var(--gris);margin-left:4px">
                 Tu voto: ${miCal}★
               </span>`
            : ''}
        </div>
      ` : `<span class="estrellas-hint">Iniciá sesión para calificar</span>`}
    </div>
  `

  el.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const val = parseInt(btn.dataset.val)
      el.querySelectorAll('.star-btn').forEach(b =>
        b.classList.toggle('hover', parseInt(b.dataset.val) <= val))
    })
    btn.addEventListener('mouseleave', () =>
      el.querySelectorAll('.star-btn').forEach(b => b.classList.remove('hover')))
    btn.addEventListener('click', () =>
      calificar(productoId, parseInt(btn.dataset.val), containerId))
  })
}

async function calificar(productoId, estrellas, containerId) {
  const user = await getUser()
  if (!user) { toast('Iniciá sesión para calificar', 'err'); return }

  const res  = await fetch('api/calificaciones.php?action=calificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ producto_id: productoId, estrellas })
  })
  const data = await res.json()

  if (data.error) { toast('Error al calificar', 'err'); return }
  toast('¡Gracias por tu calificación! ⭐', 'ok')
  renderEstrellas(productoId, containerId)
}

function renderStars(promedio) {
  return [1,2,3,4,5].map(n => {
    const llena = promedio >= n
    const media = !llena && promedio >= n - 0.5
    return `<span class="star ${llena ? 'full' : media ? 'half' : 'empty'}">★</span>`
  }).join('')
}

export async function promedioProducto(productoId) {
  const res  = await fetch(`api/calificaciones.php?action=get&producto_id=${productoId}`)
  const data = await res.json()
  if (!data.total) return null
  return { promedio: data.promedio, total: data.total }
}