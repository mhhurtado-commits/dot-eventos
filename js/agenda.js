const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
const coloresReunion = '#FF6B6B'; // color destacado para reuniones

let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '/';
    return;
  }

  // Cargar eventos Y reuniones
  await Promise.all([cargarEventosReales(), cargarReunionesReales()]);

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

  if (error) console.error('Error eventos:', error);
  window.todosLosEventos = data || [];
}

async function cargarReunionesReales() {
  const { data, error } = await supabaseClient
    .from('reuniones')
    .select('*')
    .order('fecha')
    .order('hora');

  if (error) console.error('Error reuniones:', error);
  window.todosLasReuniones = data || [];
}

function renderizarCalendario() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('mes-actual').textContent = meses[mesActual] + ' ' + anioActual;

  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const hoy = new Date();

  // Eventos del mes
  const eventosDelMes = window.todosLosEventos.filter(e => {
    const f = new Date(e.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  // Reuniones del mes
  const reunionesDelMes = window.todosLasReuniones.filter(r => {
    const f = new Date(r.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const diasConEventos = {};
  eventosDelMes.forEach(e => {
    const dia = new Date(e.fecha).getDate();
    if (!diasConEventos[dia]) diasConEventos[dia] = [];
    diasConEventos[dia].push(e);
  });

  const diasConReuniones = {};
  reunionesDelMes.forEach(r => {
    const dia = new Date(r.fecha).getDate();
    if (!diasConReuniones[dia]) diasConReuniones[dia] = [];
    diasConReuniones[dia].push(r);
  });

  const grid = document.getElementById('cal-grid');
  let html = '';

  for (let i = 0; i < primerDia; i++) {
    html += '<div class="cal-dia vacio"></div>';
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const esHoy = hoy.getDate() === dia && hoy.getMonth() === mesActual && hoy.getFullYear() === anioActual;
    const tieneEvento = diasConEventos[dia];
    const tieneReunion = diasConReuniones[dia];
    let clases = 'cal-dia';
    if (esHoy) clases += ' hoy';
    if (tieneEvento || tieneReunion) clases += ' con-evento';

    html += `<div class="${clases}" onclick="irADia(${dia})">
      <span class="cal-numero">${dia}</span>
      ${(tieneEvento || tieneReunion) ? `
        <div class="cal-puntos">
          ${tieneEvento ? tieneEvento.map(e => 
            `<span class="cal-punto" style="background:${colores[window.todosLosEventos.indexOf(e) % colores.length]}"></span>`
          ).join('') : ''}
          ${tieneReunion ? tieneReunion.map(() => 
            `<span class="cal-punto" style="background:${coloresReunion}"></span>`
          ).join('') : ''}
        </div>` : ''}
    </div>`;
  }

  grid.innerHTML = html;

  // Lista mensual (solo eventos - como antes)
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

// ==================== RECORDATORIO DIARIO ====================
function irADia(dia) {
  const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  const eventosDelDia = window.todosLosEventos.filter(e => e.fecha === fechaStr);
  const reunionesDelDia = window.todosLasReuniones.filter(r => r.fecha === fechaStr);

  if (eventosDelDia.length === 0 && reunionesDelDia.length === 0) {
    alert(`No hay actividades el ${dia}/${mesActual + 1}/${anioActual}`);
    return;
  }

  mostrarRecordatorioModal(dia, eventosDelDia, reunionesDelDia);
}

function mostrarRecordatorioModal(dia, eventos, reuniones) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%; 
    background:rgba(0,0,0,0.7); display:flex; align-items:center; 
    justify-content:center; z-index:9999; font-family: inherit;
  `;

  const contenido = `
    <div style="background:#fff; width:90%; max-width:520px; border-radius:16px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h2 style="margin:0; color:#7F77DD;">📅 Recordatorio del ${dia}/${mesActual + 1}/${anioActual}</h2>
        <button onclick="this.closest('.modal-container').remove()" style="background:none; border:none; font-size:28px; cursor:pointer;">×</button>
      </div>

      ${eventos.length ? `
        <div style="margin-bottom:20px;">
          <h3 style="color:#333; font-size:18px; margin-bottom:8px;">Eventos</h3>
          ${eventos.map(e => `
            <div onclick="window.location.href='/pages/evento?id=${e.id}'" style="cursor:pointer; padding:12px; background:#f8f9ff; border-radius:8px; margin-bottom:8px;">
              <strong>${e.nombre}</strong><br>
              <small>${e.lugar ? '📍 ' + e.lugar : ''}</small>
            </div>
          `).join('')}
        </div>` : ''}

      ${reuniones.length ? `
        <div>
          <h3 style="color:#333; font-size:18px; margin-bottom:8px;">Reuniones</h3>
          ${reuniones.map(r => `
            <div onclick="window.location.href='/pages/evento?id=${r.evento_id}'" style="cursor:pointer; padding:12px; background:#fff0f0; border-radius:8px; margin-bottom:8px; border-left:4px solid #FF6B6B;">
              <strong>${r.titulo}</strong> <span style="color:#FF6B6B;">• ${r.hora.substring(0,5)}</span><br>
              <small>${r.lugar ? '📍 ' + r.lugar : ''}</small>
              ${r.descripcion ? `<p style="font-size:13px; margin-top:4px;">${r.descripcion}</p>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

      <div style="text-align:center; margin-top:20px;">
        <button onclick="this.closest('.modal-container').remove()" 
                style="background:#7F77DD; color:white; border:none; padding:12px 24px; border-radius:8px; cursor:pointer;">
          Cerrar
        </button>
      </div>
    </div>
  `;

  modal.innerHTML = contenido;
  modal.className = 'modal-container';
  document.body.appendChild(modal);

  // Cerrar con Escape
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handler);
    }
  });
}
