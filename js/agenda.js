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

function toast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
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
    html += eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map((e, i) => {
      const fechaStr = new Date(e.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
      return `
        <div class="event-card" onclick="window.location.href='/pages/evento?id=${e.id}'">
          <div class="event-dot" style="background:${colores[i % colores.length]};"></div>
          <div class="event-info">
            <div class="event-name">${e.nombre}</div>
            <div class="event-date">${fechaStr}${e.lugar ? ' · ' + e.lugar : ''}</div>
          </div>
          <span class="event-badge ${badges[e.estado] || 'badge-borrador'}">${etiquetas[e.estado] || 'Borrador'}</span>
        </div>`;
    }).join('');
  }

  if (reuniones.length > 0) {
    html += `<div class="agenda-seccion-titulo" style="margin-top:1rem;">Reuniones</div>`;
    html += reuniones.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora)).map(r => {
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
        </div>`;
    }).join('');
  }

  lista.innerHTML = html;
}

function seleccionarDia(fechaStr) {
  const eventosDelDia = todosLosEventos.filter(e => e.fecha === fechaStr);
  const reunionesDelDia = todasLasReuniones.filter(r => r.fecha === fechaStr);
  renderizarListaDia(fechaStr, eventosDelDia, reunionesDelDia);
}

function renderizarListaDia(fechaStr, eventos, reuniones) {
  const fecha = new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('mes-actual').textContent = fecha;

  const lista = document.getElementById('eventos-mes');
  const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
  const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
  const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };

  let html = `
    <div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;">
      <button class="btn-logout" onclick="renderizarCalendario()">← Volver al mes</button>
      <button class="btn-new btn-sm" onclick="mostrarFormEvento('${fechaStr}')">+ Nuevo evento</button>
      <button class="btn-agenda btn-sm" onclick="mostrarFormReunion('${fechaStr}')">+ Nueva reunión</button>
    </div>`;

  if (eventos.length === 0 && reuniones.length === 0) {
    html += '<div class="event-empty">No hay eventos ni reuniones este día.</div>';
  }

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
      </div>`).join('');
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
      </div>`).join('');
  }

  // Formulario nuevo evento
  html += `
    <div id="form-evento-agenda" style="display:none;" class="agenda-form-modal">
      <div class="agenda-form-card">
        <div class="agenda-form-titulo">Nuevo evento — ${fecha}</div>
        <div class="form-group">
          <label class="form-label">Tipo de evento</label>
          <select id="ag-ev-tipo" class="form-input">
            <option value="cumpleanos_15">🎀 Cumpleaños 15</option>
            <option value="cumpleanos_18">🎉 Cumpleaños 18</option>
            <option value="boda">💍 Boda</option>
            <option value="corporativo">🏢 Corporativo</option>
            <option value="alquiler">📦 Alquiler mobiliario</option>
            <option value="otro">📅 Otro</option>
          </select>
        </div>
        <input type="text" id="ag-ev-nombre" class="form-input" placeholder="Nombre del evento *" style="margin-bottom:8px;" />
        <input type="text" id="ag-ev-lugar" class="form-input" placeholder="Lugar (opcional)" style="margin-bottom:8px;" />
        <input type="text" id="ag-ev-contacto" class="form-input" placeholder="Nombre del contacto *" style="margin-bottom:8px;" />
        <input type="tel" id="ag-ev-telefono" class="form-input" placeholder="Teléfono *" style="margin-bottom:8px;" />
        <div class="form-nota-actions">
          <button class="btn-cancel" onclick="cerrarForms()">Cancelar</button>
          <button class="btn-new" onclick="guardarEventoAgenda('${fechaStr}')">Guardar evento</button>
        </div>
      </div>
    </div>`;

  // Formulario nueva reunión
  html += `
    <div id="form-reunion-agenda" style="display:none;" class="agenda-form-modal">
      <div class="agenda-form-card">
        <div class="agenda-form-titulo">Nueva reunión — ${fecha}</div>
        <input type="text" id="ag-reu-titulo" class="form-input" placeholder="Título de la reunión *" style="margin-bottom:8px;" />
        <input type="time" id="ag-reu-hora" class="form-input" style="margin-bottom:8px;" />
        <input type="text" id="ag-reu-lugar" class="form-input" placeholder="Lugar (opcional)" style="margin-bottom:8px;" />
        <div class="form-group">
          <label class="form-label">Evento relacionado</label>
          <select id="ag-reu-evento" class="form-input">
            ${todosLosEventos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
          </select>
        </div>
        <textarea id="ag-reu-desc" class="form-input form-textarea" placeholder="Descripción (opcional)" style="min-height:60px;margin-top:8px;"></textarea>
        <div class="form-nota-actions" style="margin-top:8px;">
          <button class="btn-cancel" onclick="cerrarForms()">Cancelar</button>
          <button class="btn-new" onclick="guardarReunionAgenda('${fechaStr}')">Guardar reunión</button>
        </div>
      </div>
    </div>`;

  lista.innerHTML = html;
}

function mostrarFormEvento(fechaStr) {
  cerrarForms();
  document.getElementById('form-evento-agenda').style.display = 'block';
}

function mostrarFormReunion(fechaStr) {
  cerrarForms();
  if (todosLosEventos.length === 0) {
    toast('Primero creá al menos un evento para asociar la reunión.', 'error');
    return;
  }
  document.getElementById('form-reunion-agenda').style.display = 'block';
}

function cerrarForms() {
  const fe = document.getElementById('form-evento-agenda');
  const fr = document.getElementById('form-reunion-agenda');
  if (fe) fe.style.display = 'none';
  if (fr) fr.style.display = 'none';
}

async function guardarEventoAgenda(fechaStr) {
  const nombre = document.getElementById('ag-ev-nombre').value.trim();
  const tipo = document.getElementById('ag-ev-tipo').value;
  const lugar = document.getElementById('ag-ev-lugar').value.trim();
  const contacto_nombre = document.getElementById('ag-ev-contacto').value.trim();
  const contacto_telefono = document.getElementById('ag-ev-telefono').value.trim();

  if (!nombre) { toast('Por favor ingresá el nombre del evento.', 'error'); return; }
  if (!contacto_nombre) { toast('Por favor ingresá el nombre del contacto.', 'error'); return; }
  if (!contacto_telefono) { toast('Por favor ingresá el teléfono.', 'error'); return; }

  const { data: { session } } = await supabaseClient.auth.getSession();

  const { error } = await supabaseClient.from('eventos').insert({
    nombre, tipo, fecha: fechaStr, estado: 'borrador',
    lugar, contacto_nombre, contacto_telefono,
    user_id: session.user.id
  });

  if (error) { toast('Error al guardar.', 'error'); return; }

  toast('Evento creado');
  await cargarDatos();
  const eventosDelDia = todosLosEventos.filter(e => e.fecha === fechaStr);
  const reunionesDelDia = todasLasReuniones.filter(r => r.fecha === fechaStr);
  renderizarListaDia(fechaStr, eventosDelDia, reunionesDelDia);
}

async function guardarReunionAgenda(fechaStr) {
  const titulo = document.getElementById('ag-reu-titulo').value.trim();
  const hora = document.getElementById('ag-reu-hora').value;
  const lugar = document.getElementById('ag-reu-lugar').value.trim();
  const eventoId = document.getElementById('ag-reu-evento').value;
  const descripcion = document.getElementById('ag-reu-desc').value.trim();

  if (!titulo) { toast('Por favor ingresá el título.', 'error'); return; }
  if (!hora) { toast('Por favor seleccioná la hora.', 'error'); return; }

  const { error } = await supabaseClient.from('reuniones').insert({
    titulo, fecha: fechaStr, hora, lugar,
    evento_id: parseInt(eventoId), descripcion
  });

  if (error) { toast('Error al guardar.', 'error'); return; }

  toast('Reunión creada');
  await cargarDatos();
  const eventosDelDia = todosLosEventos.filter(e => e.fecha === fechaStr);
  const reunionesDelDia = todasLasReuniones.filter(r => r.fecha === fechaStr);
  renderizarListaDia(fechaStr, eventosDelDia, reunionesDelDia);
}