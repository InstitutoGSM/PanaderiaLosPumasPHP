// fecha.js — Inyecta la fecha/año en el DOM. No requiere imports.
(function () {
  const ahora = new Date();
  const el = document.getElementById('fecha-actual');
  if (el) el.textContent = ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const ea = document.getElementById('anio-actual');
  if (ea) ea.textContent = ahora.getFullYear();
})();
