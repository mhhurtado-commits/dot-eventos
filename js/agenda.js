const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };

let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async () => {
  // ←←← AUTENTICACIÓN
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '/';
    return;
  }

  // Cargar eventos reales desde Supabase
  await cargarEventosReales();

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

async function cargarEventosReales() {
  const { data, error } = await supabaseClient
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: true });

  if (error) {
    console.error('Error cargando eventos:', error);
    alert('No se pudieron cargar los eventos. Revisa la consola (F12).');
    window.todosLosEventos = [];
    return;
  }

  window.todosLosEventos = data || [];
  console.log('Eventos cargados:', window.todosLosEventos.length);
}

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

  // Lista de eventos del mes
  const lista = document.getElementById('eventos-mes');
  if (eventosDelMes.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay eventos este mes.</div>';
    return;
  }

  eventosDelMes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  lista.innerHTML = eventosDelMes.map((evento) => {
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
  } else if (eventosDelDia.length > 1) {
    alert(`Hay ${eventosDelDia.length} eventos el día ${dia}. Selecciona uno desde la lista de abajo.`);
  }
}
