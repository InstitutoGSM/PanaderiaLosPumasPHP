// ─── utils.js ─────────────────────────────────────────────────────────────────
// Exporta helpers compartidos. Importar en cada módulo que los necesite.
// Respuesta del servidor: { ok: true, data: ... } | { ok: false, error: "..." }

// ── Atajos DOM ────────────────────────────────────────────────────────────────
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── URL param ─────────────────────────────────────────────────────────────────
export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── Fetch wrapper ──────────────────────────────────────────────────────────────
// Devuelve { ok, data, error }
export async function api(url, opts = {}) {
  try {
    const isFormData = opts.body instanceof FormData;
    const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { ...headers, ...(opts.headers || {}) },
      ...opts,
      body: opts.body && !isFormData && typeof opts.body === 'object'
        ? JSON.stringify(opts.body)
        : opts.body,
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Error de conexión' };
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────
// tipos: 'ok' | 'error' | 'info' | 'warn'
export function toast(msg, tipo = 'info', ms = 3500) {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = Object.assign(document.createElement('div'), { id: 'toast-box' });
    box.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(box);
  }
  const BG = { ok: '#2e7d32', error: '#c62828', info: '#1565c0', warn: '#e65100' };
  const t = document.createElement('div');
  t.style.cssText = `background:${BG[tipo] || BG.info};color:#fff;padding:11px 18px;border-radius:10px;font-size:.92rem;font-weight:600;box-shadow:0 4px 18px rgba(0,0,0,.22);max-width:340px;line-height:1.4;transition:opacity .3s;pointer-events:auto`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, ms);
}

// ── Formato de precio ─────────────────────────────────────────────────────────
export function formatPrecio(n) {
  if (n == null || n === '') return '—';
  return '$\u202F' + Number(n).toLocaleString('es-AR');
}

// ── Formato de fecha ──────────────────────────────────────────────────────────
export function formatFecha(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Iniciales de un nombre ────────────────────────────────────────────────────
export function iniciales(nombre) {
  if (!nombre) return '?';
  const p = nombre.trim().split(/\s+/);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// ── Capitalizar ───────────────────────────────────────────────────────────────
export function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Badge de estado ───────────────────────────────────────────────────────────
export function badgeEstado(estado) {
  const M = {
    pendiente:  ['#7c4a00', '#fff3e0', 'Pendiente'],
    confirmado: ['#1565c0', '#e3f2fd', 'Confirmado'],
    listo:      ['#4a148c', '#f3e5f5', 'Listo'],
    entregado:  ['#1b5e20', '#e8f5e9', 'Entregado'],
    cancelado:  ['#b71c1c', '#ffebee', 'Cancelado'],
  };
  const [c, bg, lbl] = M[estado] || ['#444', '#eee', estado];
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:.8rem;font-weight:700;color:${c};background:${bg}">${lbl}</span>`;
}

// ── Botón loading ─────────────────────────────────────────────────────────────
export function setLoading(btn, loading, textoBtnOriginal = '') {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    if (!btn._origText) btn._origText = btn.textContent;
    btn.textContent = 'Cargando…';
  } else {
    btn.textContent = textoBtnOriginal || btn._origText || 'Enviar';
    btn._origText = null;
  }
}
