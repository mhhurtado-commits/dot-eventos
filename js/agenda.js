const eventosPrueba = [
  { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000 },
  { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000 },
  { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000 },
  { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000 }
];

const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };

let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {

  const eventosGuardados = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
  window.todosLosEventos = [...eventosPrueba, ...eventosGuardados];

  renderizarCalendario();

  document.getElementById('btn-prev').addEventListener('click', () => {
    mesActual--;
    if (mesActual < 0) { mesActual = 11; anioActual--; }
    renderizarCalendario();
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    mesActual++;
    if (mesActual > 11) { mesActual = 0; anioActual++; }
    renderizarCalendario();
  });

});

function renderizarCalendario() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('mes-actual').textContent = meses[mesActual] + ' ' + anioActual;

  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const hoy = new Date();

  const eventosDelMes = window.todosLosEventos.filter(e => {
    const f = new Date(e.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const diasConEventos = {};
  eventosDelMes.forEach(e => {
    const dia = new Date(e.fecha).getDate();
    if (!diasConEventos[dia]) diasConEventos[dia] = [];
    diasConEventos[dia].push(e);
  });

  const grid = document.getElementById('cal-grid');
  let html = '';

  for (let i = 0; i < primerDia; i++) {
    html += '<div class="cal-dia vacio"></div>';
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const esHoy = hoy.getDate() === dia && hoy.getMonth() === mesActual && hoy.getFullYear() === anioActual;
    const tieneEventos = diasConEventos[dia];
    let clases = 'cal-dia';
    if (esHoy) clases += ' hoy';
    if (tieneEventos) clases += ' con-evento';

    html += `<div class="${clases}" onclick="irADia(${dia})">
      <span class="cal-numero">${dia}</span>
      ${tieneEventos ? `<div class="cal-puntos">${tieneEventos.map(e => `<span class="cal-punto" style="background:${colores[window.todosLosEventos.indexOf(e) % colores.length]}"></span>`).join('')}</div>` : ''}
    </div>`;
  }

  grid.innerHTML = html;

  // Eventos del mes
  const lista = document.getElementById('eventos-mes');
  if (eventosDelMes.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay eventos este mes.</div>';
    return;
  }

  eventosDelMes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  lista.innerHTML = eventosDelMes.map((evento, i) => {
    const fecha = new Date(evento.fecha);
    const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const color = colores[window.todosLosEventos.indexOf(evento) % colores.length];
    const estado = evento.estado || 'borrador';

    return `
      <div class="event-card" onclick="window.location.href='/pages/evento?id=${evento.id}'">
        <div class="event-dot" style="background:${color};"></div>
        <div class="event-info">
          <div class="event-name">${evento.nombre}</div>
          <div class="event-date">${fechaStr}${evento.lugar ? ' · ' + evento.lugar : ''}</div>
        </div>
        <span class="event-badge ${badges[estado]}">${etiquetas[estado]}</span>
      </div>
    `;
  }).join('');
}

function irADia(dia) {
  const eventosDelDia = window.todosLosEventos.filter(e => {
    const f = new Date(e.fecha);
    return f.getDate() === dia && f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });
  if (eventosDelDia.length === 1) {
    window.location.href = '/pages/evento?id=' + eventosDelDia[0].id;
  }
}