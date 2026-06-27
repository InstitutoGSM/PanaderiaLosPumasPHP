// ─── auth.js ──────────────────────────────────────────────────────────────────
import { api, toast, iniciales } from './utils.js';

// ── Sesión ────────────────────────────────────────────────────────────────────
export async function getSession() {
  const r = await api('api/auth.php?action=session');
  return r.ok ? r.data : null;
}

// ── Requiere sesión (redirige si no hay) ──────────────────────────────────────
export async function requireSession(tipo = null) {
  const u = await getSession();
  if (!u) { window.location.href = tipo === 'admin' ? 'admin-login.php' : 'login.php'; return null; }
  if (tipo && u.tipo !== tipo) {
    const dest = { admin: 'admin.php', vendedor: 'vendedor.php', comprador: 'catalogo.php' };
    window.location.href = dest[u.tipo] || 'catalogo.php'; return null;
  }
  return u;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  return api('api/auth.php?action=login', { method: 'POST', body: { email, password } });
}

// ── Registro ──────────────────────────────────────────────────────────────────
export async function register(data) {
  return api('api/auth.php?action=register', { method: 'POST', body: data });
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout() {
  await api('api/auth.php?action=logout', { method: 'POST' });
  window.location.href = 'index.php';
}

// ── Reset password ────────────────────────────────────────────────────────────
export async function resetRequest(email) {
  return api('api/auth.php?action=reset-request', { method: 'POST', body: { email } });
}

export async function resetPassword(token, password) {
  return api('api/auth.php?action=reset-password', { method: 'POST', body: { token, password } });
}

// ── Navbar según sesión ───────────────────────────────────────────────────────
// Maneja: #nav-btn (link login), #nav-historial, #nav-logout (botón)
export function initNav(u) {
  const btnLogin    = document.getElementById('nav-btn');
  const btnLogout   = document.getElementById('nav-logout');
  const btnHistorial = document.getElementById('nav-historial');

  if (u) {
    if (btnLogin)    btnLogin.style.display    = 'none';
    if (btnHistorial) btnHistorial.style.display = '';
    if (btnLogout) {
      btnLogout.style.display = '';
      btnLogout.addEventListener('click', logout);
    }
  } else {
    if (btnLogin)    btnLogin.style.display    = '';
    if (btnHistorial) btnHistorial.style.display = 'none';
    if (btnLogout)   btnLogout.style.display   = 'none';
  }
}

// ── Redirigir según tipo ──────────────────────────────────────────────────────
export function redirigir(tipo) {
  const dest = { admin: 'admin.php', vendedor: 'vendedor.php', comprador: 'catalogo.php' };
  window.location.href = dest[tipo] || 'catalogo.php';
}
