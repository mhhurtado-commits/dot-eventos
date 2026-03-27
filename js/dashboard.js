let usuarioActual = null;

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

  document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtrados = window.todosLosEventos.filter(ev =>
      ev.nombre.toLowerCase().includes(query) ||
      (ev.lugar || '').toLowerCase().includes(query) ||
      (ev.tipo || '').toLowerCase().includes(query)
    );
    renderizarEventos(filtrados);
  });

  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtro = btn.dataset.filtro;
      const filtrados = filtro === 'todos'
        ? window.todosLosEventos
        : window.todosLosEventos.filter(e => e.estado === filtro);
      renderizarEventos(filtrados);
    });
  });

});

async function cargarEventos() {
  const { data: eventos, error } = await supabaseClient
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: true });

  if (error) { console.error(error); return; }

  window.todosLosEventos = eventos || [];
  actualizarMetricas(window.todosLosEventos);
  renderizarEventos(window.todosLosEventos);
}

function actualizarMetricas(eventos) {
  const hoy = new Date();
  const activos = eventos.filter(e => new Date(e.fecha) >= hoy);

  document.getElementById('metric-activos').textContent = activos.length;
  document.getElementById('metric-reuniones').textContent = '—';

  if (activos.length > 0) {
    const proximo = activos[0];
    const fecha = new Date(proximo.fecha);
    document.getElementById('metric-proximo').textContent =
      fecha.getDate() + ' ' + fecha.toLocaleString('es-AR', { month: 'short' });
    document.getElementById('metric-proximo-nombre').textContent = proximo.nombre;
  }

  cargarReunionesHoy();
}

async function cargarReunionesHoy() {
  // Fecha de hoy en zona horaria local (Argentina)
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
      <button onclick="this.parentElement.remove()" class="banner-cerrar">✕</button>
    `;
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
    'cumpleanos_15': '🎀', 'cumpleanos_18': '🎉', 'boda': '💍',
    'corporativo': '🏢', 'alquiler': '📦', 'otro': '📅'
  };

  lista.innerHTML = eventos.map((evento, i) => {
    const fecha = new Date(evento.fecha);
    const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const color = colores[i % colores.length];
    const estado = evento.estado || 'borrador';
    const hoy = new Date();
    const diasRestantes = Math.ceil((new Date(evento.fecha) - hoy) / (1000 * 60 * 60 * 24));
    const diasTag = diasRestantes >= 0 && diasRestantes <= 30
      ? `<span style="font-size:11px;color:#854F0B;background:#faeeda;padding:2px 8px;border-radius:20px;margin-left:6px;">${diasRestantes === 0 ? '¡Hoy!' : 'En ' + diasRestantes + ' días'}</span>`
      : '';
    const icono = tiposIcono[evento.tipo] || '📅';

    return `
      <div class="event-card" onclick="window.location.href='/pages/evento?id=${evento.id}'">
        <div class="event-dot" style="background:${color};"></div>
        <div class="event-info">
          <div class="event-name">${icono} ${evento.nombre} ${diasTag}</div>
          <div class="event-date">${fechaStr}${evento.lugar ? ' · ' + evento.lugar : ''}${evento.contacto_nombre ? ' · ' + evento.contacto_nombre : ''}</div>
        </div>
        <span class="event-badge ${badges[estado] || 'badge-borrador'}">${etiquetas[estado] || 'Borrador'}</span>
      </div>
    `;
  }).join('');
}

async function verificarReunionesDeDia() {
  // Ya manejado en cargarReunionesHoy()
}