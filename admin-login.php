<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Panaderia Los Pumas</title>
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/login.css">
  <style>html,body{overflow-x:hidden;min-height:100vh}</style>
</head>
<body>

<div class="login-wrap" style="grid-template-columns:1fr">
  <div class="login-col">

    <div class="logo-wrap">
      <div class="logo-circle">
        <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'">
      </div>
      <div class="logo-nombre">
        <span class="top">Panel</span>
        <span class="bot">ADMIN</span>
      </div>
      <div class="logo-div"><div class="logo-div-dot"></div></div>
    </div>

    <div class="login-card">
      <p class="panel-title" style="font-size:1.4rem">Acceso Administrativo</p>
      <p style="text-align:center;color:var(--gris);font-size:0.85rem;margin-bottom:20px">
        Solo personal autorizado
      </p>

      <div class="field">
        <label for="a-email">Email</label>
        <input type="email" id="a-email" placeholder="admin@email.com" autocomplete="email">
      </div>
      <div class="field">
        <label for="a-pass">Contraseña</label>
        <input type="password" id="a-pass" placeholder="••••••••" autocomplete="current-password">
      </div>

      <button class="btn-login" id="btn-admin-login">Ingresar</button>

      <p style="text-align:center;font-size:0.75rem;color:var(--gris);margin-top:16px">
        <a href="index.php" style="color:var(--gris)">← Volver al sitio</a>
      </p>
    </div>

  </div>
</div>

<div id="toast-box"></div>

<script type="module">
  import { toast } from './js/utils.js'
  import { getUser, getPerfil } from './js/auth.js'

  // Si ya está logueado como admin, redirigir directo
  const user = await getUser()
  if (user) {
    const perfil = await getPerfil(user.id)
    if (perfil?.tipo === 'admin') location.href = 'admin.php'
  }

  document.getElementById('btn-admin-login').addEventListener('click', async () => {
    const btn   = document.getElementById('btn-admin-login')
    const email = document.getElementById('a-email').value.trim()
    const pass  = document.getElementById('a-pass').value

    if (!email || !pass) { toast('Completá los campos', 'err'); return }

    btn.disabled = true; btn.textContent = 'Verificando...'

    const res  = await fetch('api/auth.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    })
    const data = await res.json()

    if (data.error) {
      toast('Credenciales incorrectas', 'err')
      btn.disabled = false; btn.textContent = 'Ingresar'
      return
    }

    if (data.tipo !== 'admin') {
      await fetch('api/auth.php?action=logout', { method: 'POST' })
      toast('No tenés permisos de administrador', 'err')
      btn.disabled = false; btn.textContent = 'Ingresar'
      return
    }

    location.href = 'admin.php'
  })

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-admin-login').click()
  })
</script>
</body>
</html>