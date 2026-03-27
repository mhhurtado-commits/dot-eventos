let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let todosLosEventos = [];
let todasLasReuniones = [];

function fechaHoyLocal() {
  const ahora = new Date();
  return ahora.getFullYear() + '-' +
    String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
    String(ahora.getDate()).padStart(2, '0');
}

document.addEventListener('DOMContentLoaded', async () => {

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = '/'; return; }

  await cargarDatos();
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

async function cargarDatos() {
  const [{ data: eventos }, { data: reuniones }] = await Promise.all([
    supabaseClient.from('eventos').select('*').order('fecha', { ascending: true }),
    supabaseClient.from('reuniones').select('*, eventos(nombre)').order('fecha').order('hora')
  ]);

  todosLosEventos = eventos || [];
  todasLasReuniones = reuniones || [];
}

function renderizarCalendario() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('mes-actual').textContent = meses[mesActual] + ' ' + anioActual;

  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const hoy = fechaHoyLocal();

  const eventosDelMes = todosLosEventos.filter(e => {
    const f = new Date(e.fecha + 'T12:00:00');
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const reunionesDelMes = todasLasReuniones.filter(r => {
    const f = new Date(r.fecha + 'T12:00:00');
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const eventosPorDia = {};
  eventosDelMes.forEach(e => {
    const dia = new Date(e.fecha + 'T12:00:00').getDate();
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push(e);
  });

  const reunionesPorDia = {};
  reunionesDelMes.forEach(r => {
    const dia = new Date(r.fecha + 'T12:00:00').getDate();
    if (!reunionesPorDia[dia]) reunionesPorDia[dia] = [];
    reunionesPorDia[dia].push(r);
  });

  const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];

  const grid = document.getElementById('cal-grid');
  let html = '';

  for (let i = 0; i < primerDia; i++) {
    html += '<div class="cal-dia vacio"></div>';
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fechaDia = anioActual + '-' +
      String(mesActual + 1).padStart(2, '0') + '-' +
      String(dia).padStart(2, '0');
    const esHoy = fechaDia === hoy;
    const tieneEventos = eventosPorDia[dia];
    const tieneReuniones = reunionesPorDia[dia];
    let clases = 'cal-dia';
    if (esHoy) clases += ' hoy';
    if (tieneEventos || tieneReuniones) clases += ' con-evento';

    const puntosEventos = tieneEventos
      ? tieneEventos.map((e, i) => `<span class="cal-punto" style="background:${colores[i % colores.length]}"></span>`).join('')
      : '';
    const puntosReuniones = tieneReuniones
      ? `<span class="cal-punto reunion-punto"></span>`
      : '';

    html += `
      <div class="${clases}" onclick="seleccionarDia('${fechaDia}')">
        <span class="cal-numero">${dia}</span>
        ${(tieneEventos || tieneReuniones) ? `<div class="cal-puntos">${puntosEventos}${puntosReuniones}</div>` : ''}
      </div>`;
  }

  grid.innerHTML = html;
  renderizarListaMes(eventosDelMes, reunionesDelMes);
}

function renderizarListaMes(eventos, reuniones) {
  const lista = document.getElementById('eventos-mes');
  const hoy = fechaHoyLocal();
  const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
  const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
  const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };

  if (eventos.length === 0 && reuniones.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay eventos ni reuniones este mes.</div>';
    return;
  }

  let html = '';

  if (eventos.length > 0) {
    html += `<div class="agenda-seccion-titulo">Eventos</div>`;
    html += eventos
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map((e, i) => {
        const fechaStr = new Date(e.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
        const color = colores[i % colores.length];
        const estado = e.estado || 'borrador';
        return `
          <div class="event-card" onclick="window.location.href='/pages/evento?id=${e.id}'">
            <div class="event-dot" style="background:${color};"></div>
            <div class="event-info">
              <div class="event-name">${e.nombre}</div>
              <div class="event-date">${fechaStr}${e.lugar ? ' · ' + e.lugar : ''}</div>
            </div>
            <span class="event-badge ${badges[estado]}">${etiquetas[estado]}</span>
          </div>
        `;
      }).join('');
  }

  if (reuniones.length > 0) {
    html += `<div class="agenda-seccion-titulo" style="margin-top:1rem;">Reuniones</div>`;
    html += reuniones
      .sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora))
      .map(r => {
        const fechaStr = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
        const esHoy = r.fecha === hoy;
        return `
          <div class="reunion-card ${esHoy ? 'hoy' : ''}" onclick="window.location.href='/pages/reuniones?id=${r.evento_id}'">
            <div class="reunion-header">
              <div class="reunion-titulo">${r.titulo}</div>
              ${esHoy ? '<span class="reunion-hoy-tag">Hoy</span>' : ''}
            </div>
            <div class="reunion-fecha">${fechaStr} · ${r.hora.substring(0,5)}${r.lugar ? ' · 📍 ' + r.lugar : ''}</div>
            ${r.eventos?.nombre ? `<div style="font-size:11px;color:#bbb;margin-top:3px;">📅 ${r.eventos.nombre}</div>` : ''}
          </div>
        `;
      }).join('');
  }

  lista.innerHTML = html;
}

function seleccionarDia(fechaStr) {
  const eventosDelDia = todosLosEventos.filter(e => e.fecha === fechaStr);
  const reunionesDelDia = todasLasReuniones.filter(r => r.fecha === fechaStr);

  if (eventosDelDia.length === 1 && reunionesDelDia.length === 0) {
    window.location.href = '/pages/evento?id=' + eventosDelDia[0].id;
    return;
  }

  if (eventosDelDia.length === 0 && reunionesDelDia.length === 1) {
    window.location.href = '/pages/reuniones?id=' + reunionesDelDia[0].evento_id;
    return;
  }

  if (eventosDelDia.length > 0 || reunionesDelDia.length > 0) {
    renderizarListaDia(fechaStr, eventosDelDia, reunionesDelDia);
  }
}

function renderizarListaDia(fechaStr, eventos, reuniones) {
  const fecha = new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('mes-actual').textContent = fecha;

  const lista = document.getElementById('eventos-mes');
  const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
  const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
  const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };

  let html = `<div class="agenda-dia-header">
    <button class="btn-logout" onclick="renderizarCalendario()" style="margin-bottom:0.75rem;">← Volver al mes</button>
  </div>`;

  if (eventos.length > 0) {
    html += `<div class="agenda-seccion-titulo">Eventos</div>`;
    html += eventos.map((e, i) => `
      <div class="event-card" onclick="window.location.href='/pages/evento?id=${e.id}'">
        <div class="event-dot" style="background:${colores[i % colores.length]};"></div>
        <div class="event-info">
          <div class="event-name">${e.nombre}</div>
          <div class="event-date">${e.lugar || '—'}</div>
        </div>
        <span class="event-badge ${badges[e.estado] || 'badge-borrador'}">${etiquetas[e.estado] || 'Borrador'}</span>
      </div>
    `).join('');
  }

  if (reuniones.length > 0) {
    html += `<div class="agenda-seccion-titulo" style="margin-top:1rem;">Reuniones</div>`;
    html += reuniones.map(r => `
      <div class="reunion-card" onclick="window.location.href='/pages/reuniones?id=${r.evento_id}'">
        <div class="reunion-header">
          <div class="reunion-titulo">${r.titulo}</div>
        </div>
        <div class="reunion-fecha">${r.hora.substring(0,5)}${r.lugar ? ' · 📍 ' + r.lugar : ''}</div>
        ${r.eventos?.nombre ? `<div style="font-size:11px;color:#bbb;margin-top:3px;">📅 ${r.eventos.nombre}</div>` : ''}
      </div>
    `).join('');
  }

  lista.innerHTML = html;
}