// ─── calificaciones.js ────────────────────────────────────────────────────────
import { api, toast, formatFecha } from './utils.js';

// HTML de estrellas de solo lectura
export function estrellasSVG(n) {
  let h = '';
  for (let i = 1; i <= 5; i++)
    h += `<span style="color:${i <= n ? '#f59e0b' : '#d1d5db'};font-size:1.1rem">${i <= n ? '★' : '☆'}</span>`;
  return h;
}

// Widget interactivo de estrellas
export function widgetEstrellas(container, onChange) {
  if (!container) return;
  let sel = 0;
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '☆';
    s.style.cssText = 'font-size:2rem;cursor:pointer;color:#d1d5db;transition:color .1s';
    s.addEventListener('mouseenter', () => highlight(i));
    s.addEventListener('mouseleave', () => highlight(sel));
    s.addEventListener('click', () => { sel = i; highlight(i); if (onChange) onChange(i); });
    container.appendChild(s);
  }
  function highlight(n) {
    [...container.children].forEach((s, idx) => {
      s.style.color = idx < n ? '#f59e0b' : '#d1d5db';
      s.textContent = idx < n ? '★' : '☆';
    });
  }
  return { getValor: () => sel };
}

// Carga y renderiza las calificaciones de un producto
export async function cargarCalificaciones(productoId, container) {
  if (!container) return;
  const r = await api(`api/calificaciones.php?action=listar&producto_id=${productoId}`);
  if (!r.ok || !r.data || r.data.length === 0) {
    container.innerHTML = '<p style="color:#888;font-size:.9rem">Aún no hay calificaciones.</p>';
    return;
  }
  container.innerHTML = r.data.map(c => `
    <div style="border-bottom:1px solid #f0e8d8;padding:10px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <strong style="font-size:.9rem">${c.usuario_nombre || 'Usuario'}</strong>
        <span>${estrellasSVG(c.estrellas)}</span>
        <small style="color:#888;margin-left:auto">${formatFecha(c.created_at)}</small>
      </div>
      ${c.comentario ? `<p style="margin:0;font-size:.88rem;color:#555">${c.comentario}</p>` : ''}
    </div>
  `).join('');
}

// Calificación del usuario actual para un producto
export async function getMiCalificacion(productoId) {
  const r = await api(`api/calificaciones.php?action=mi-calificacion&producto_id=${productoId}`);
  return r.ok ? r.data : null;
}

// Enviar calificación
export async function enviarCalificacion(data) {
  return api('api/calificaciones.php?action=crear', { method: 'POST', body: data });
}
