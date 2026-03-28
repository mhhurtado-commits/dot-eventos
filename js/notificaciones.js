let notificacionesCache = [];

async function cargarNotificaciones() {
  const ahora = new Date();
  const hoy = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0');
  const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const en7diasStr = en7dias.getFullYear() + '-' + String(en7dias.getMonth() + 1).padStart(2, '0') + '-' + String(en7dias.getDate()).padStart(2, '0');
  const en30dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const en30diasStr = en30dias.getFullYear() + '-' + String(en30dias.getMonth() + 1).padStart(2, '0') + '-' + String(en30dias.getDate()).padStart(2, '0');

  const notifs = [];

  // Cobros vencidos
  const { data: cobrosVencidos } = await supabaseClient
    .from('cobros')
    .select('*, eventos(nombre)')
    .eq('estado', 'pendiente')
    .lt('fecha_vencimiento', hoy);

  (cobrosVencidos || []).forEach(c => {
    notifs.push({
      tipo: 'error',
      icono: '⚠️',
      titulo: 'Cobro vencido',
      texto: `${c.concepto} — $${c.monto.toLocaleString('es-AR')} (${c.eventos?.nombre})`,
      fecha: c.fecha_vencimiento
    });
  });

  // Cobros próximos a vencer
  const { data: cobrosProximos } = await supabaseClient
    .from('cobros')
    .select('*, eventos(nombre)')
    .eq('estado', 'pendiente')
    .gte('fecha_vencimiento', hoy)
    .lte('fecha_vencimiento', en7diasStr);

  (cobrosProximos || []).forEach(c => {
    notifs.push({
      tipo: 'warning',
      icono: '💰',
      titulo: 'Cobro próximo',
      texto: `${c.concepto} vence el ${new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} (${c.eventos?.nombre})`,
      fecha: c.fecha_vencimiento
    });
  });

  // Reuniones mañana
  const manana = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  const mananaStr = manana.getFullYear() + '-' + String(manana.getMonth() + 1).padStart(2, '0') + '-' + String(manana.getDate()).padStart(2, '0');

  const { data: reunionesManana } = await supabaseClient
    .from('reuniones')
    .select('*, eventos(nombre)')
    .eq('fecha', mananaStr)
    .order('hora');

  (reunionesManana || []).forEach(r => {
    notifs.push({
      tipo: 'info',
      icono: '📅',
      titulo: 'Reunión mañana',
      texto: `${r.titulo} a las ${r.hora.substring(0, 5)} (${r.eventos?.nombre})`,
      fecha: mananaStr
    });
  });

  // Eventos próximos en 30 días
  const { data: eventosProximos } = await supabaseClient
    .from('eventos')
    .select('*')
    .gte('fecha', hoy)
    .lte('fecha', en30diasStr)
    .order('fecha');

  (eventosProximos || []).forEach(e => {
    const dias = Math.ceil((new Date(e.fecha + 'T12:00:00') - ahora) / (1000 * 60 * 60 * 24));
    notifs.push({
      tipo: dias <= 7 ? 'warning' : 'info',
      icono: dias <= 7 ? '🔥' : '📌',
      titulo: dias === 0 ? '¡Evento hoy!' : `Evento en ${dias} días`,
      texto: `${e.nombre}${e.lugar ? ' · ' + e.lugar : ''}`,
      fecha: e.fecha
    });
  });

  notificacionesCache = notifs;
  actualizarBadge(notifs.length);
  return notifs;
}

function actualizarBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function toggleNotificaciones() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const visible = panel.style.display === 'block';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) renderizarNotificaciones();
}

function renderizarNotificaciones() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;

  if (notificacionesCache.length === 0) {
    panel.innerHTML = `
      <div class="notif-header">
        <span class="notif-titulo">Notificaciones</span>
        <button onclick="toggleNotificaciones()" class="notif-cerrar">✕</button>
      </div>
      <div class="notif-empty">No hay alertas pendientes 🎉</div>`;
    return;
  }

  const coloresTipo = {
    error: '#FCEBEB',
    warning: '#faeeda',
    info: '#f4f3ff'
  };

  const coloresTexto = {
    error: '#A32D2D',
    warning: '#854F0B',
    info: '#534AB7'
  };

  panel.innerHTML = `
    <div class="notif-header">
      <span class="notif-titulo">Notificaciones (${notificacionesCache.length})</span>
      <button onclick="toggleNotificaciones()" class="notif-cerrar">✕</button>
    </div>
    <div class="notif-lista">
      ${notificacionesCache.map(n => `
        <div class="notif-item" style="background:${coloresTipo[n.tipo] || '#f4f3ff'};">
          <div class="notif-icono">${n.icono}</div>
          <div class="notif-contenido">
            <div class="notif-item-titulo" style="color:${coloresTexto[n.tipo]};">${n.titulo}</div>
            <div class="notif-item-texto">${n.texto}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

// Cerrar panel al hacer clic afuera
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-btn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});