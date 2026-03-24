const eventos = [
  { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000 },
  { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000 },
  { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000 },
  { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000 }
];

const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
const badges = {
  confirmado: 'badge-confirmado',
  progreso: 'badge-progreso',
  borrador: 'badge-borrador'
};
const etiquetas = {
  confirmado: 'Confirmado',
  progreso: 'En progreso',
  borrador: 'Borrador'
};

const reservasPrueba = [
  { nombre: 'Fotografía', contacto: 'Juan Pérez', telefono: '261-555-1234', estado: 'confirmado' },
  { nombre: 'Catering', contacto: 'La Cocina', telefono: '261-555-5678', estado: 'progreso' }
];

let eventoActual = null;

document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  const eventosGuardados = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
  const todosLosEventos = [...eventos, ...eventosGuardados];
  const evento = todosLosEventos.find(e => e.id === id) || eventos[0];
  const idx = todosLosEventos.findIndex(e => e.id === evento.id);
  eventoActual = evento;

  const color = colores[idx % colores.length];
  document.getElementById('evento-dot').style.background = color;
  document.getElementById('evento-titulo').textContent = evento.nombre;

  const fecha = new Date(evento.fecha);
  const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const lugar = evento.lugar ? ' · ' + evento.lugar : '';
  document.getElementById('evento-meta').textContent = fechaStr + lugar;

  const badge = document.getElementById('evento-badge');
  badge.textContent = etiquetas[evento.estado] || 'Borrador';
  badge.className = 'event-badge ' + (badges[evento.estado] || 'badge-borrador');

  document.getElementById('info-nombre').textContent = evento.nombre;
  document.getElementById('info-fecha').textContent = fechaStr;
  document.getElementById('info-lugar').textContent = evento.lugar || '—';
  document.getElementById('info-estado').textContent = etiquetas[evento.estado] || 'Borrador';

  // Reservas
  const reservaList = document.getElementById('reserva-list');
  reservaList.innerHTML = reservasPrueba.map(r => `
    <div class="reserva-card">
      <div class="reserva-nombre">${r.nombre}</div>
      <div class="reserva-detalle">${r.contacto} · ${r.telefono}</div>
      <span class="event-badge ${badges[r.estado] || 'badge-borrador'}" style="margin-top:8px;display:inline-block;">
        ${etiquetas[r.estado] || 'Borrador'}
      </span>
    </div>
  `).join('');

  // Movimientos
  renderizarMovimientos();
  actualizarMetricas();

  document.getElementById('btn-agregar-movimiento').addEventListener('click', () => {
    document.getElementById('form-movimiento').style.display = 'flex';
    document.getElementById('mov-fecha').valueAsDate = new Date();
  });

  document.getElementById('btn-cancelar-movimiento').addEventListener('click', () => {
    document.getElementById('form-movimiento').style.display = 'none';
    limpiarFormMovimiento();
  });

  document.getElementById('btn-guardar-movimiento').addEventListener('click', () => {
    const concepto = document.getElementById('mov-concepto').value.trim();
    const tipo = document.getElementById('mov-tipo').value;
    const monto = parseFloat(document.getElementById('mov-monto').value) || 0;
    const fecha = document.getElementById('mov-fecha').value;

    if (!concepto) {
      alert('Por favor ingresá un concepto.');
      return;
    }
    if (!monto || monto <= 0) {
      alert('Por favor ingresá un monto válido.');
      return;
    }
    if (!fecha) {
      alert('Por favor seleccioná una fecha.');
      return;
    }

    const clave = 'dot-movimientos-' + eventoActual.id;
    const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');
    movimientos.push({ id: Date.now(), concepto, tipo, monto, fecha });
    localStorage.setItem(clave, JSON.stringify(movimientos));

    document.getElementById('form-movimiento').style.display = 'none';
    limpiarFormMovimiento();
    renderizarMovimientos();
    actualizarMetricas();
  });

  // Notas
  renderizarNotas();

  document.getElementById('btn-agregar-nota').addEventListener('click', () => {
    document.getElementById('form-nota').style.display = 'flex';
  });

  document.getElementById('btn-cancelar-nota').addEventListener('click', () => {
    document.getElementById('form-nota').style.display = 'none';
    document.getElementById('nota-titulo-input').value = '';
    document.getElementById('nota-texto-input').value = '';
  });

  document.getElementById('btn-guardar-nota').addEventListener('click', () => {
    const titulo = document.getElementById('nota-titulo-input').value.trim();
    const texto = document.getElementById('nota-texto-input').value.trim();

    if (!titulo) {
      alert('Por favor ingresá un título para la nota.');
      return;
    }

    const clave = 'dot-notas-' + eventoActual.id;
    const notas = JSON.parse(localStorage.getItem(clave) || '[]');
    notas.push({ id: Date.now(), titulo, texto, creado: new Date().toISOString() });
    localStorage.setItem(clave, JSON.stringify(notas));

    document.getElementById('form-nota').style.display = 'none';
    document.getElementById('nota-titulo-input').value = '';
    document.getElementById('nota-texto-input').value = '';
    renderizarNotas();
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('btn-editar').addEventListener('click', () => {
    window.location.href = '/pages/editar-evento?id=' + evento.id;
  });

});

function limpiarFormMovimiento() {
  document.getElementById('mov-concepto').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-fecha').value = '';
  document.getElementById('mov-tipo').value = 'egreso';
}

function actualizarMetricas() {
  const clave = 'dot-movimientos-' + eventoActual.id;
  const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');

  const gastado = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((acc, m) => acc + m.monto, 0);

  const saldo = (eventoActual.presupuesto || 0) - gastado;

  document.getElementById('ev-presupuesto').textContent = '$' + (eventoActual.presupuesto || 0).toLocaleString('es-AR');
  document.getElementById('ev-gastado').textContent = '$' + gastado.toLocaleString('es-AR');
  document.getElementById('ev-saldo').textContent = '$' + saldo.toLocaleString('es-AR');

  const elSaldo = document.getElementById('ev-saldo');
  elSaldo.style.color = saldo >= 0 ? '#1D9E75' : '#D85A30';
}

function renderizarMovimientos() {
  const clave = 'dot-movimientos-' + eventoActual.id;
  const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');
  const movList = document.getElementById('movimiento-list');

  if (movimientos.length === 0) {
    movList.innerHTML = '<div class="event-empty">No hay movimientos todavía.</div>';
    return;
  }

  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  movList.innerHTML = movimientos.map(m => `
    <div class="movimiento-card">
      <div class="movimiento-row">
        <span class="movimiento-concepto">${m.concepto}</span>
        <span class="movimiento-monto ${m.tipo}">
          ${m.tipo === 'egreso' ? '-' : '+'}$${m.monto.toLocaleString('es-AR')}
        </span>
      </div>
      <div class="movimiento-footer">
        <span class="movimiento-fecha">${new Date(m.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
        <button class="btn-eliminar-nota" onclick="eliminarMovimiento(${m.id})">✕</button>
      </div>
    </div>
  `).join('');
}

function eliminarMovimiento(movId) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  const clave = 'dot-movimientos-' + eventoActual.id;
  const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');
  const nuevos = movimientos.filter(m => m.id !== movId);
  localStorage.setItem(clave, JSON.stringify(nuevos));
  renderizarMovimientos();
  actualizarMetricas();
}

function renderizarNotas() {
  const clave = 'dot-notas-' + eventoActual.id;
  const notas = JSON.parse(localStorage.getItem(clave) || '[]');
  const notaList = document.getElementById('nota-list');

  if (notas.length === 0) {
    notaList.innerHTML = '<div class="event-empty">No hay notas todavía.</div>';
    return;
  }

  notaList.innerHTML = notas.map(n => `
    <div class="nota-card">
      <div class="nota-header">
        <div class="nota-titulo">${n.titulo}</div>
        <button class="btn-eliminar-nota" onclick="eliminarNota(${n.id})">✕</button>
      </div>
      <div class="nota-texto">${n.texto || '—'}</div>
    </div>
  `).join('');
}

function eliminarNota(notaId) {
  if (!confirm('¿Eliminar esta nota?')) return;
  const clave = 'dot-notas-' + eventoActual.id;
  const notas = JSON.parse(localStorage.getItem(clave) || '[]');
  const nuevas = notas.filter(n => n.id !== notaId);
  localStorage.setItem(clave, JSON.stringify(nuevas));
  renderizarNotas();
}