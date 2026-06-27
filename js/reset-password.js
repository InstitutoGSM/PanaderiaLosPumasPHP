// ─── reset-password.js ────────────────────────────────────────────────────────
// Maneja reset-password.php (sólo el formulario de nueva contraseña con token)
import { toast, setLoading, getParam } from './utils.js';
import { resetPassword } from './auth.js';

(async function () {

  const token = getParam('token');
  if (!token) {
    // Sin token no hay nada que hacer aquí — el request se hace desde login.php
    document.querySelector('.reset-wrap')?.insertAdjacentHTML('afterbegin',
      '<p style="color:#c62828;font-weight:600">Token no válido o expirado. <a href="login.php">Volver al login</a></p>');
    return;
  }

  const npPass  = document.getElementById('np-pass');
  const npPass2 = document.getElementById('np-pass2');
  const btnGuardar = document.getElementById('btn-np-guardar');

  if (!btnGuardar) return;

  btnGuardar.addEventListener('click', async () => {
    const pass  = npPass?.value || '';
    const pass2 = npPass2?.value || '';

    if (!pass || !pass2) { toast('Completá ambos campos', 'warn'); return; }
    if (pass.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warn'); return; }
    if (pass !== pass2)  { toast('Las contraseñas no coinciden', 'warn'); return; }

    setLoading(btnGuardar, true);
    const r = await resetPassword(token, pass);
    setLoading(btnGuardar, false, 'Guardar nueva contraseña');

    if (!r.ok) { toast(r.error || 'Error al cambiar contraseña', 'error'); return; }
    toast('Contraseña cambiada. Podés iniciar sesión ahora.', 'ok', 4000);
    setTimeout(() => { window.location.href = 'login.php'; }, 2000);
  });

  [npPass, npPass2].forEach(el => {
    el?.addEventListener('keydown', e => { if (e.key === 'Enter') btnGuardar.click(); });
  });

})();
