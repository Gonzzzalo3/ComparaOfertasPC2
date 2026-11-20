const root = document.getElementById('root');

function showRuntimeError(message) {
  if (!root || root.dataset.runtimeError === 'shown') return;
  root.dataset.runtimeError = 'shown';
  root.innerHTML = `<main style="max-width:760px;margin:10vh auto;padding:2rem;font:16px/1.5 system-ui;color:#25302a"><h1>No se pudo iniciar ComparaOfertas</h1><p>El servidor está disponible, pero ocurrió un error al cargar la interfaz. Copia este detalle para corregirlo:</p><pre style="white-space:pre-wrap;background:#f4f2ec;padding:1rem;border-radius:8px">${String(message).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</pre><button onclick="location.reload()" style="padding:.7rem 1rem;border:0;border-radius:6px;background:#227b54;color:white">Volver a intentar</button></main>`;
}

window.addEventListener('error', (event) => showRuntimeError(event.error?.stack || event.message || 'Error JavaScript'));
window.addEventListener('unhandledrejection', (event) => showRuntimeError(event.reason?.stack || event.reason || 'Error asíncrono'));
