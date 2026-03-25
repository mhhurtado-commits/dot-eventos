document.addEventListener('DOMContentLoaded', () => {

  const nombre = 'Miguel';
  const iniciales = 'MH';

  document.getElementById('user-greeting').textContent = 'Bienvenido, ' + nombre;
  document.getElementById('user-avatar').textContent = iniciales;

  document.getElementById('btn-logout').addEventListener('click', () => {
    window.location.href = '/';
  });

  document.getElementById('btn-nuevo').addEventListener('click', () => {
    window.location.href = '/pages/nuevo-evento';
  });

  const eventosGuardados = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
  const eventosPrueba = [
    { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000 },
    { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000 },
    { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000 },
    { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000 }
  ];

  const todosLosEventos = eventosGuardados.length > 0
    ? [...eventosPrueba, ...eventosGuardados]
    : eventosPrueba;

  actualizarMetricas(todosLosEventos);
  renderizarEventos(todosLosEventos);
  verificarReunionesDeDia();

  // Búsqueda
  document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtrados = todosLosEventos.filter(ev =>
      ev.nombre.toLowerCase().includes(query) ||
      (ev.lugar || '').toLowerCase().includes(query)
    );
    renderizarEventos(filtrados);
  });

  // Filtros
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtro = btn.dataset.filtro;
      const filtrados = filtro === 'todos'
        ? todosLosEventos
        : todosLosEventos.filter(e => e.estado === filtro);
      renderizarEventos(filtrados);
    });
  });

});

function actualizarMetricas(eventos) {
  const hoy = new Date();
  const activos = eventos.filter(e => new Date(e.fecha) >= hoy);

  document.getElementById('metric-activos').textContent = activos.length;
  document.getElementById('metric-presupuesto-sub').textContent = eventos.length + ' eventos';

  const totalPresupuesto = eventos.reduce((acc, e) => acc + (e.presupuesto || 0), 0);
  document.getElementById('metric-presupuesto').textContent = '$' + totalPresupuesto.toLocaleString('es-AR');

  if (activos.length > 0) {
    const proximo = activos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
    const fecha = new Date(proximo.fecha);
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-AR', { month: 'short' });
    document.getElementById('metric-proximo').textContent = dia + ' ' + mes;
    document.getElementById('metric-proximo-nombre').textContent = proximo.nombre;
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

  eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  lista.innerHTML = eventos.map((evento, i) => {
    const fecha = new Date(evento.fecha);
    const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const color = colores[i % colores.length];
    const estado = evento.estado || 'borrador';
    const badge = badges[estado] || 'badge-borrador';
    const etiqueta = etiquetas[estado] || 'Borrador';
    const presupuesto = evento.presupuesto ? '$' + evento.presupuesto.toLocaleString('es-AR') : '—';
    const lugar = evento.lugar ? ' · ' + evento.lugar : '';
    const hoy = new Date();
    const diasRestantes = Math.ceil((new Date(evento.fecha) - hoy) / (1000 * 60 * 60 * 24));
    const diasTag = diasRestantes >= 0 && diasRestantes <= 30
      ? `<span style="font-size:11px;color:#854F0B;background:#faeeda;padding:2px 8px;border-radius:20px;margin-left:8px;">${diasRestantes === 0 ? '¡Hoy!' : 'En ' + diasRestantes + ' días'}</span>`
      : '';

    return `
      <div class="event-card" onclick="window.location.href='/pages/evento?id=${evento.id}'">
        <div class="event-dot" style="background:${color};"></div>
        <div class="event-info">
          <div class="event-name">${evento.nombre} ${diasTag}</div>
          <div class="event-date">${fechaStr}${lugar}</div>
        </div>
        <span class="event-badge ${badge}">${etiqueta}</span>
        <div class="event-amount">${presupuesto}</div>
      </div>
    `;
  }).join('');
}

function verificarReunionesDeDia() {
  if (!('Notification' in window)) return;

  const hoy = new Date().toISOString().split('T')[0];
  const clavesReuniones = Object.keys(localStorage).filter(k => k.startsWith('dot-reuniones-'));

  const reunionesHoy = [];
  clavesReuniones.forEach(clave => {
    const reuniones = JSON.parse(localStorage.getItem(clave) || '[]');
    reuniones.forEach(r => { if (r.fecha === hoy) reunionesHoy.push(r); });
  });

  if (reunionesHoy.length === 0) return;

  reunionesHoy.sort((a, b) => a.hora.localeCompare(b.hora));

  if (Notification.permission === 'granted') {
    const resumen = reunionesHoy.map(r => `• ${r.hora} — ${r.titulo}`).join('\n');
    new Notification('DOT Eventos — Reuniones de hoy', { body: resumen });
  }

  const banner = document.createElement('div');
  banner.className = 'banner-reuniones';
  banner.innerHTML = `
    <div class="banner-titulo">📅 Reuniones de hoy (${reunionesHoy.length})</div>
    <div class="banner-lista">${reunionesHoy.map(r => `<span>${r.hora} — ${r.titulo}</span>`).join('')}</div>
    <button onclick="this.parentElement.remove()" class="banner-cerrar">✕</button>
  `;
  const content = document.querySelector('.db-content');
  if (content) content.prepend(banner);
}