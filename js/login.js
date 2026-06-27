// ─── login.js ─────────────────────────────────────────────────────────────────
// Maneja login.php: tabs login/registro/recuperar
import { api, toast, setLoading, getParam } from './utils.js';
import { getSession, login, register, resetRequest, redirigir } from './auth.js';

(async function () {

  // Si ya tiene sesión, redirigir
  const u = await getSession();
  if (u) { redirigir(u.tipo); return; }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  // login.php usa botones con data-tab y paneles con id="panel-X"
  const tabBtns = document.querySelectorAll('[data-tab]');
  const panels  = { login: document.getElementById('panel-login'), registro: document.getElementById('panel-registro'), recuperar: document.getElementById('panel-recuperar') };

  function mostrarPanel(nombre) {
    Object.entries(panels).forEach(([k, el]) => {
      if (el) el.classList.toggle('on', k === nombre);
    });
    tabBtns.forEach(b => b.classList.toggle('on', b.dataset.tab === nombre));
  }

  tabBtns.forEach(b => b.addEventListener('click', () => mostrarPanel(b.dataset.tab)));

  // Links entre paneles
  const irRecuperar        = document.getElementById('ir-recuperar');
  const irRegistro         = document.getElementById('ir-registro');
  const irLoginFromRec     = document.getElementById('ir-login-from-recuperar');
  const irLogin            = document.getElementById('ir-login');
  if (irRecuperar)    irRecuperar.addEventListener('click',    e => { e.preventDefault(); mostrarPanel('recuperar'); });
  if (irRegistro)     irRegistro.addEventListener('click',     e => { e.preventDefault(); mostrarPanel('registro'); });
  if (irLoginFromRec) irLoginFromRec.addEventListener('click', e => { e.preventDefault(); mostrarPanel('login'); });
  if (irLogin)        irLogin.addEventListener('click',        e => { e.preventDefault(); mostrarPanel('login'); });

  // Activar tab según URL ?tab=registro
  const tabParam = getParam('tab');
  mostrarPanel(tabParam === 'registro' ? 'registro' : 'login');

  // ── PANEL LOGIN ───────────────────────────────────────────────────────────
  const lEmail  = document.getElementById('l-email');
  const lPass   = document.getElementById('l-pass');
  const btnLogin = document.getElementById('btn-login');

  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = lEmail?.value.trim() || '';
      const pass  = lPass?.value || '';
      if (!email || !pass) { toast('Completá email y contraseña', 'warn'); return; }

      setLoading(btnLogin, true);
      const r = await login(email, pass);
      setLoading(btnLogin, false, 'Iniciar Sesión');

      if (!r.ok) { toast(r.error || 'Credenciales incorrectas', 'error'); return; }
      toast('¡Bienvenido, ' + r.data.nombre + '!', 'ok');
      setTimeout(() => redirigir(r.data.tipo), 700);
    });
  }

  // ── PANEL REGISTRO ────────────────────────────────────────────────────────
  const rNombre    = document.getElementById('r-nombre');
  const rEmail     = document.getElementById('r-email');
  const rPass      = document.getElementById('r-pass');
  const rPanaderia = document.getElementById('r-panaderia');
  const campoPan   = document.getElementById('campo-panaderia');
  const avisoPan   = document.getElementById('aviso-vendedor');
  const passBar    = document.getElementById('pass-bar');
  const passLabel  = document.getElementById('pass-label');
  const btnReg     = document.getElementById('btn-registro');

  // Selector de tipo (divs con data-tipo)
  let tipoSeleccionado = 'comprador';
  document.querySelectorAll('[data-tipo]').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('[data-tipo]').forEach(o => o.classList.remove('on'));
      opt.classList.add('on');
      tipoSeleccionado = opt.dataset.tipo;
      if (campoPan) campoPan.style.display = tipoSeleccionado === 'vendedor' ? '' : 'none';
      if (avisoPan) avisoPan.style.display = tipoSeleccionado === 'vendedor' ? '' : 'none';
    });
  });

  // Barra de fuerza de contraseña
  function fuerzaPass(p) {
    let pts = 0;
    if (p.length >= 8) pts++;
    if (/[A-Z]/.test(p)) pts++;
    if (/[0-9]/.test(p)) pts++;
    if (/[^A-Za-z0-9]/.test(p)) pts++;
    return pts;
  }
  if (rPass) {
    rPass.addEventListener('input', function () {
      const pts = fuerzaPass(this.value);
      const cols = ['#c62828', '#f57c00', '#1565c0', '#2e7d32'];
      const lbls = ['Muy débil', 'Débil', 'Buena', 'Fuerte'];
      if (passBar) { passBar.style.width = (pts * 25) + '%'; passBar.style.background = cols[pts - 1] || '#ddd'; }
      if (passLabel) { passLabel.textContent = this.value ? (lbls[pts - 1] || '') : ''; passLabel.style.color = cols[pts - 1] || ''; }
    });
  }

  if (btnReg) {
    btnReg.addEventListener('click', async () => {
      const nombre   = rNombre?.value.trim() || '';
      const email    = rEmail?.value.trim() || '';
      const password = rPass?.value || '';
      if (!nombre || !email || !password) { toast('Completá todos los campos', 'warn'); return; }
      if (password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warn'); return; }
      if (tipoSeleccionado === 'vendedor' && !rPanaderia?.value.trim()) {
        toast('Ingresá el nombre de tu panadería', 'warn'); return;
      }

      setLoading(btnReg, true);
      const r = await register({ nombre, email, password, tipo: tipoSeleccionado, panaderia_nombre: rPanaderia?.value.trim() });
      setLoading(btnReg, false, 'Registrarse');

      if (!r.ok) { toast(r.error || 'No se pudo registrar', 'error'); return; }
      toast('¡Cuenta creada! Bienvenido/a, ' + r.data.nombre, 'ok');
      setTimeout(() => redirigir(r.data.tipo), 800);
    });
  }

  // ── PANEL RECUPERAR ───────────────────────────────────────────────────────
  const recEmail   = document.getElementById('rec-email');
  const btnRecuperar = document.getElementById('btn-recuperar');

  if (btnRecuperar) {
    btnRecuperar.addEventListener('click', async () => {
      const email = recEmail?.value.trim() || '';
      if (!email) { toast('Ingresá tu email', 'warn'); return; }

      setLoading(btnRecuperar, true);
      const r = await resetRequest(email);
      setLoading(btnRecuperar, false, 'Enviar link de recuperación');

      if (!r.ok) { toast(r.error || 'Error al enviar', 'error'); return; }
      toast('Si el email existe, recibirás el enlace de recuperación', 'ok', 5000);
      if (recEmail) recEmail.value = '';
    });
  }

})();
