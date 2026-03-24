// Datos de prueba
const eventos = [
  { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000 },
  { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000 },
  { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000 },
  { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000 }
];

const reservasPrueba = [
  { nombre: 'Fotografía', contacto: 'Juan Pérez', telefono: '261-555-1234', estado: 'confirmado' },
  { nombre: 'Catering', contacto: 'La Cocina', telefono: '261-555-5678', estado: 'progreso' }
];

const movimientosPrueba = [
  { concepto: 'Seña fotografía', monto: -15000, fecha: '2026-03-10', tipo: 'egreso' },
  { concepto: 'Anticipo cliente', monto: 100000, fecha: '2026-03-05', tipo: 'ingreso' }
];

const notasPrueba = [
  { titulo: 'Paleta de colores', texto: 'Blanco, verde sage y dorado. Evitar colores fuertes.' },
  { titulo: 'Sitio de fotos', texto: 'https://drive.google.com/carpeta-garcia' }
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

document.addEventListener('DOMContentLoaded', () => {

  // Obtener ID del evento desde la URL
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  const evento = eventos.find(e => e.id === id) || eventos[0];
  const idx = eventos.findIndex(e => e.id === id) || 0;

  // Encabezado
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

  // Métricas
  const gastado = movimientosPrueba
    .filter(m => m.tipo === 'egreso')
    .reduce((acc, m) => acc + Math.abs(m.monto), 0);
  const saldo = evento.presupuesto - gastado;

  document.getElementById('ev-presupuesto').textContent = '$' + evento.presupuesto.toLocaleString('es-AR');
  document.getElementById('ev-gastado').textContent = '$' + gastado.toLocaleString('es-AR');
  document.getElementById('ev-saldo').textContent = '$' + saldo.toLocaleString('es-AR');

  // Info
  document.getElementById('info-nombre').textContent = evento.nombre;
  document.getElementById('info-fecha').textContent = fechaStr;
  document.getElementById('info-lugar').textContent = evento.lugar || '—';
  document.getElementById('info-estado').textContent = etiquetas[evento.estado] || 'Borrador';

  // Reservas
  const reservaList = document.getElementById('reserva-list');
  if (reservasPrueba.length > 0) {
    reservaList.innerHTML = reservasPrueba.map(r => `
      <div class="reserva-card">
        <div class="reserva-nombre">${r.nombre}</div>
        <div class="reserva-detalle">${r.contacto} · ${r.telefono}</div>
        <span class="event-badge ${badges[r.estado] || 'badge-borrador'}" style="margin-top:8px;display:inline-block;">
          ${etiquetas[r.estado] || 'Borrador'}
        </span>
      </div>
    `).join('');
  }

  // Movimientos
  const movList = document.getElementById('movimiento-list');
  if (movimientosPrueba.length > 0) {
    movList.innerHTML = movimientosPrueba.map(m => `
      <div class="movimiento-card">
        <div class="movimiento-row">
          <span class="movimiento-concepto">${m.concepto}</span>
          <span class="movimiento-monto ${m.tipo}">
            ${m.tipo === 'egreso' ? '-' : '+'}$${Math.abs(m.monto).toLocaleString('es-AR')}
          </span>
        </div>
        <div class="movimiento-fecha">${new Date(m.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</div>
      </div>
    `).join('');
  }

  // Notas
  const notaList = document.getElementById('nota-list');
  if (notasPrueba.length > 0) {
    notaList.innerHTML = notasPrueba.map(n => `
      <div class="nota-card">
        <div class="nota-titulo">${n.titulo}</div>
        <div class="nota-texto">${n.texto}</div>
      </div>
    `).join('');
  }

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

});