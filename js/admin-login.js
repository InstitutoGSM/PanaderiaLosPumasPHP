// ─── admin-login.js ───────────────────────────────────────────────────────────
import { toast, setLoading } from './utils.js';
import { getSession, login } from './auth.js';

(async function () {

  const u = await getSession();
  if (u && u.tipo === 'admin') { window.location.href = 'admin.php'; return; }

  const aEmail   = document.getElementById('a-email');
  const aPass    = document.getElementById('a-pass');
  const btnLogin = document.getElementById('btn-admin-login');

  if (!btnLogin) return;

  btnLogin.addEventListener('click', async () => {
    const email    = aEmail?.value.trim() || '';
    const password = aPass?.value || '';
    if (!email || !password) { toast('Completá email y contraseña', 'warn'); return; }

    setLoading(btnLogin, true);
    const r = await login(email, password);
    setLoading(btnLogin, false, 'Ingresar');

    if (!r.ok) { toast(r.error || 'Credenciales incorrectas', 'error'); return; }
    if (r.data.tipo !== 'admin') { toast('Acceso denegado: solo administradores', 'error'); return; }

    toast('Bienvenido, ' + r.data.nombre, 'ok');
    setTimeout(() => { window.location.href = 'admin.php'; }, 600);
  });

  // Enter en los campos
  [aEmail, aPass].forEach(el => {
    el?.addEventListener('keydown', e => { if (e.key === 'Enter') btnLogin.click(); });
  });

})();
