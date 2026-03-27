let usuarioActual = null;
let todosLosEventos = [];

document.addEventListener('DOMContentLoaded', async () => {

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = '/'; return; }

  usuarioActual = session.user;
  const nombre = usuarioActual.user_metadata?.full_name?.split(' ')[0] || 'Usuario';
  const iniciales = (usuarioActual.user_metadata?.full_name || usuarioActual.email)
    .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  document.getElementById('user-greeting').textContent = 'Bienvenido, ' + nombre;
  document.getElementById('user-avatar').textContent = iniciales;

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = '/';
  });

  document.getElementById('btn-nuevo').addEventListener('click', () => {
    window.location.href = '/pages/nuevo-evento';
  });

  await cargarEventos();
  verificarReunionesDeDia();

  // Búsqueda global
  document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length === 0) {
      aplicarVista(vistaActual);
      return;
    }
    const filtrados = todosLosEventos.filter(ev =>
      ev.nombre.toLowerCase().includes(query) ||
      (ev.lugar || '').toLowerCase().includes(query) ||
      (ev.contacto_nombre || '').toLowerCase().includes(query) ||
      (ev.tipo || '').toLowerCase().includes(query)
    );
    renderizarEventos(filtrados);
  });

  // Filtros de estado
  document.querySelectorAll('[data-filtro]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filtro]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtro = btn.dataset.filtro;
      const filtrados = filtro === 'todos'
        ? getEventosPorVista(vistaActual)
        : getEventosPorVista(vistaActual).filter(e => e.estado === filtro);
      renderizarEventos(filtrados);
    });
  });

  // Filtros de vista (próximos/historial/todos)
  document.querySelectorAll('[data-vista]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vista]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      vistaActual = btn.dataset.vista;
      aplicarVista(vistaActual);
      document.getElementById('lista-titulo').textContent =
        vistaActual === 'pasados' ? 'Historial de eventos' :
        vistaActual === 'todos' ? 'Todos los eventos' : 'Próximos eventos';
    });
  });

});

let vistaActual = 'proximos';

function getEventosPorVista(vista) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (vista === 'proximos') return todosLosEventos.filter(e => new Date(e.fecha + 'T12:00:00') >= hoy);
  if (vista === 'pasados') return todosLosEventos.filter(e => new Date(e.fecha + 'T12:00:00') < hoy);
  return todosLosEventos;
}

function aplicarVista(vista) {
  document.querySelectorAll('[data-filtro]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-filtro="todos"]')?.classList.add('active');
  renderizarEventos(getEventosPorVista(vista));
}

async function cargarEventos() {
  const { data: eventos, error } = await supabaseClient
    .from('eventos').select('*').order('fecha', { ascending: true });

  if (error) { console.error(error); return; }
  todosLosEventos = eventos || [];
  actualizarMetricas(todosLosEventos);
  aplicarVista('proximos');
}

function actualizarMetricas(eventos) {
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  const activos = eventos.filter(e => new Date(e.fecha + 'T12:00:00') >= ahora);

  document.getElementById('metric-activos').textContent = activos.length;
  document.getElementById('metric-reuniones').textContent = '—';

  if (activos.length > 0) {
    const proximo = activos[0];
    const fecha = new Date(proximo.fecha + 'T12:00:00');
    document.getElementById('metric-proximo').textContent =
      fecha.getDate() + ' ' + fecha.toLocaleString('es-AR', { month: 'short' });
    document.getElementById('metric-proximo-nombre').textContent = proximo.nombre;
  }

  cargarReunionesHoy();
}

async function cargarReunionesHoy() {
  const ahora = new Date();
  const hoy = ahora.getFullYear() + '-' +
    String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
    String(ahora.getDate()).padStart(2, '0');

  const { data: reuniones } = await supabaseClient
    .from('reuniones')
    .select('*, eventos(nombre)')
    .eq('fecha', hoy)
    .order('hora', { ascending: true });

  const count = reuniones?.length || 0;
  document.getElementById('metric-reuniones').textContent = count;
  document.getElementById('metric-reuniones-sub').textContent = count === 1 ? 'reunión hoy' : 'reuniones hoy';

  if (reuniones && reuniones.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'banner-reuniones';
    banner.innerHTML = `
      <div class="banner-titulo">📅 Reuniones de hoy (${reuniones.length})</div>
      <div class="banner-lista">${reuniones.map(r => `<span>${r.hora.substring(0,5)} — ${r.titulo} <small style="color:#aaa;">(${r.eventos?.nombre})</small></span>`).join('')}</div>
      <button onclick="this.parentElement.remove()" class="banner-cerrar">✕</button>`;
    const content = document.querySelector('.db-content');
    if (content) content.prepend(banner);

    if (Notification.permission === 'granted') {
      new Notification('DOT Eventos — Reuniones de hoy', {
        body: reuniones.map(r => `• ${r.hora.substring(0,5)} — ${r.titulo}`).join('\n')
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

function renderizarEventos(eventos) {
  const lista = document.getElementById('event-list');

  if (eventos.length === 0) {
    lista.innerHTML = '<div class="event-empty">No se encontraron eventos.</div>';
    return;
  }

  const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
  const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
  const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };
  const tiposIcono = {
    cumpleanos_15: '🎀', cumpleanos_18: '🎉', boda: '💍',
    corporativo: '🏢', alquiler: '📦', otro: '📅'
  };

  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);

  lista.innerHTML = eventos.map((evento, i) => {
    const fechaEvento = new Date(evento.fecha + 'T12:00:00');
    const fechaStr = fechaEvento.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const color = colores[i % colores.length];
    const estado = evento.estado || 'borrador';
    const esPasado = fechaEvento < ahora;
    const diasRestantes = Math.ceil((fechaEvento - ahora) / (1000 * 60 * 60 * 24));
    const diasTag = !esPasado && diasRestantes <= 30
      ? `<span style="font-size:11px;color:#854F0B;background:#faeeda;padding:2px 8px;border-radius:20px;margin-left:6px;">${diasRestantes === 0 ? '¡Hoy!' : 'En ' + diasRestantes + ' días'}</span>`
      : esPasado ? `<span style="font-size:11px;color:#999;background:#f1efe8;padding:2px 8px;border-radius:20px;margin-left:6px;">Realizado</span>` : '';
    const icono = tiposIcono[evento.tipo] || '📅';

    return `
      <div class="event-card ${esPasado ? 'event-pasado' : ''}" onclick="window.location.href='/pages/evento?id=${evento.id}'">
        <div class="event-dot" style="background:${color};${esPasado ? 'opacity:0.5;' : ''}"></div>
        <div class="event-info">
          <div class="event-name">${icono} ${evento.nombre} ${diasTag}</div>
          <div class="event-date">${fechaStr}${evento.lugar ? ' · ' + evento.lugar : ''}${evento.contacto_nombre ? ' · ' + evento.contacto_nombre : ''}</div>
        </div>
        <span class="event-badge ${badges[estado] || 'badge-borrador'}">${etiquetas[estado] || 'Borrador'}</span>
      </div>`;
  }).join('');
}

async function verificarReunionesDeDia() {
  // Manejado en cargarReunionesHoy
}