// ─── upload.js ────────────────────────────────────────────────────────────────
import { toast } from './utils.js';

// Sube un archivo al servidor
// tipo: 'producto' | 'avatar' | 'banner' | 'documento'
export async function subirArchivo(file, tipo = 'producto') {
  const fd = new FormData();
  fd.append('archivo', file);
  const res = await fetch(`api/uploads.php?tipo=${tipo}`, {
    method: 'POST', credentials: 'same-origin', body: fd,
  });
  const r = await res.json();
  if (!r.ok) throw new Error(r.error || 'Error al subir archivo');
  return r.data.url;
}

// Conecta un <input type=file> con preview + callback onUrl(url)
export function conectarUpload(inputId, previewEl, tipo = 'producto', onUrl = null) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) return;

  input.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    // Preview local instantáneo
    if (previewEl) {
      const reader = new FileReader();
      reader.onload = e => {
        if (previewEl.tagName === 'IMG') { previewEl.src = e.target.result; previewEl.style.display = ''; }
        else previewEl.innerHTML = `<img src="${e.target.result}" style="max-height:160px;border-radius:8px">`;
      };
      reader.readAsDataURL(file);
    }

    try {
      const url = await subirArchivo(file, tipo);
      toast('Archivo subido correctamente', 'ok');
      if (onUrl) onUrl(url);
    } catch (e) {
      toast('Error al subir: ' + e.message, 'error');
    }
  });
}
