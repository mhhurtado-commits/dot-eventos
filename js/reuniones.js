const eventosPrueba = [
  { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000 },
  { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000 },
  { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000 },
  { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000 }
];

let eventoActual = null;

function toast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
}

document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  const eventosGuardados = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
  const todos = [...eventosPrueba, ...eventosGuardados];
  eventoActual = todos.find(e => e.id === id) || eventosPrueba[0];

  document.getElementById('evento-subtitulo').textContent = eventoActual.nombre;

  document.getElementById('btn-volver').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + eventoActual.id;
  });

  document.getElementById('btn-agregar').addEventListener('click', () => {
    document.getElementById('form-reunion').style.display = 'flex';
    document.getElementById('reu-fecha').valueAsDate = new Date();
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => {
    document.getElementById('form-reunion').style.display = 'none';
    limpiarForm();
  });

  document.getElementById('btn-guardar').addEventListener('click', guardarReunion);

  renderizarReuniones();
  solicitarPermisoNotificaciones();
});

function limpiarForm() {
  ['reu-titulo', 'reu-fecha', 'reu-hora', 'reu-lugar', 'reu-descripcion'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function guardarReunion() {
  const titulo = document.getElementById('reu-titulo').value.trim();
  const fecha = document.getElementById('reu-fecha').value;
  const hora = document.getElementById('reu-hora').value;
  const lugar = document.getElementById('reu-lugar').value.trim();
  const descripcion = document.getElementById('reu-descripcion').value.trim();

  if (!titulo) { toast('Por favor ingresá un título.', 'error'); return; }
  if (!fecha) { toast('Por favor seleccioná una fecha.', 'error'); return; }
  if (!hora) { toast('Por favor seleccioná una hora.', 'error'); return; }

  const clave = 'dot-reuniones-' + eventoActual.id;
  const reuniones = JSON.parse(localStorage.getItem(clave) || '[]');
  reuniones.push({ id: Date.now(), titulo, fecha, hora, lugar, descripcion });
  localStorage.setItem(clave, JSON.stringify(reuniones));

  document.getElementById('form-reunion').style.display = 'none';
  limpiarForm();
  renderizarReuniones();
  toast('Reunión guardada');
}

function renderizarReuniones() {
  const clave = 'dot-reuniones-' + eventoActual.id;
  const reuniones = JSON.parse(localStorage.getItem(clave) || '[]');
  const lista = document.getElementById('reunion-list');

  if (reuniones.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay reuniones todavía.</div>';
    return;
  }

  reuniones.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));

  const hoy = new Date().toISOString().split('T')[0];

  lista.innerHTML = reuniones.map(r => {
    const fecha = new Date(r.fecha + 'T' + r.hora);
    const fechaStr = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const esHoy = r.fecha === hoy;
    const esPasada = new Date(r.fecha + 'T' + r.hora) < new Date();

    return `
      <div class="reunion-card ${esPasada ? 'pasada' : ''} ${esHoy ? 'hoy' : ''}">
        <div class="reunion-header">
          <div class="reunion-titulo">${r.titulo}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${esHoy ? '<span class="reunion-hoy-tag">Hoy</span>' : ''}
            <button class="btn-eliminar-nota" onclick="eliminarReunion(${r.id})">✕</button>
          </div>
        </div>
        <div class="reunion-meta">
          <span class="reunion-fecha">${fechaStr} · ${horaStr}</span>
          ${r.lugar ? `<span class="reunion-lugar">📍 ${r.lugar}</span>` : ''}
        </div>
        ${r.descripcion ? `<div class="reunion-descripcion">${r.descripcion}</div>` : ''}
      </div>
    `;
  }).join('');
}

function eliminarReunion(rId) {
  if (!confirm('¿Eliminar esta reunión?')) return;
  const clave = 'dot-reuniones-' + eventoActual.id;
  const reuniones = JSON.parse(localStorage.getItem(clave) || '[]');
  localStorage.setItem(clave, JSON.stringify(reuniones.filter(r => r.id !== rId)));
  renderizarReuniones();
  toast('Reunión eliminada');
}

function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}