// ── GET USER (sesión actual) ──
export async function getUser() {
  const res  = await fetch('api/auth.php?action=session')
  const data = await res.json()
  return data.user ?? null
}

// ── GET PERFIL ──
export async function getPerfil(userId) {
  const res  = await fetch(`api/profiles.php?action=get&id=${userId}`)
  const data = await res.json()
  return data.error ? null : data
}

// ── LOGOUT ──
export async function logout() {
  await fetch('api/auth.php?action=logout', { method: 'POST' })
  window.location.href = 'login.php'
}

// ── REQUIRE AUTH ──
export async function requireAuth(redirigirSi = null) {
  const user = await getUser()
  if (!user) {
    window.location.href = 'login.php'
    return null
  }
  const perfil = await getPerfil(user.id)
  if (redirigirSi && perfil?.tipo !== redirigirSi) {
    window.location.href = 'index.php'
    return null
  }
  return { user, perfil }
}

// ── OBT USUARIO O INVITADO ──
export async function getUsuarioOInvitado() {
  const user = await getUser()
  if (user) return user
  return { id: null, esInvitado: true }
}

// ── REQUIRE AUTH PARA COMPRAR ──
export async function requireAuthParaComprar() {
  const user = await getUser()
  if (!user) {
    sessionStorage.setItem('redirect_after_login', location.href)
    sessionStorage.setItem('login_motivo', 'Para finalizar tu compra necesitás iniciar sesión 🛒')
    window.location.href = 'login.php'
    return null
  }
  return user
}