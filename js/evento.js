const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };
const tiposLabel = {
  cumpleanos_15: '🎀 Cumpleaños 15', cumpleanos_18: '🎉 Cumpleaños 18',
  boda: '💍 Boda', corporativo: '🏢 Corporativo',
  alquiler: '📦 Alquiler mobiliario', otro: '📅 Otro'
};

let eventoActual = null;

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

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const { data: evento, error } = await supabaseClient
    .from('eventos').select('*').eq('id', id).single();

  if (error || !evento) { window.location.href = '/pages/dashboard'; return; }
  eventoActual = evento;

  // Encabezado
  document.getElementById('evento-dot').style.background = colores[0];
  document.getElementById('evento-titulo').textContent = evento.nombre;
  const fecha = new Date(evento.fecha);
  const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('evento-meta').textContent = fechaStr + (evento.lugar ? ' · ' + evento.lugar : '');
  const badge = document.getElementById('evento-badge');
  badge.textContent = etiquetas[evento.estado] || 'Borrador';
  badge.className = 'event-badge ' + (badges[evento.estado] || 'badge-borrador');

  // Progreso
  renderizarProgreso(fecha);

  // Info
  document.getElementById('info-tipo').textContent = tiposLabel[evento.tipo] || '📅 Otro';
  document.getElementById('info-nombre').textContent = evento.nombre;
  document.getElementById('info-fecha').textContent = fechaStr;
  document.getElementById('info-lugar').textContent = evento.lugar || '—';
  document.getElementById('info-estado').textContent = etiquetas[evento.estado] || 'Borrador';
  document.getElementById('info-contacto').textContent = evento.contacto_nombre || '—';
  document.getElementById('info-telefono').textContent = evento.contacto_telefono || '—';
  document.getElementById('info-email').textContent = evento.contacto_email || '—';
  document.getElementById('info-direccion').textContent = evento.contacto_direccion || '—';

  // Cargar todo
  await Promise.all([
    cargarReunionesPreview(),
    cargarReservas(),
    cargarMovimientos(),
    cargarNotas()
  ]);

  // Reuniones
  document.getElementById('btn-ir-reuniones').addEventListener('click', () => {
    window.location.href = '/pages/reuniones?id=' + eventoActual.id;
  });

  // Reservas
  document.getElementById('btn-agregar-reserva').addEventListener('click', () => {
    document.getElementById('form-reserva').style.display = 'flex';
  });
  document.getElementById('btn-cancelar-reserva').addEventListener('click', () => {
    document.getElementById('form-reserva').style.display = 'none';
    limpiarFormReserva();
  });
  document.getElementById('btn-guardar-reserva').addEventListener('click', guardarReserva);

  // Movimientos
  document.getElementById('btn-agregar-movimiento').addEventListener('click', () => {
    document.getElementById('form-movimiento').style.display = 'flex';
    document.getElementById('mov-fecha').valueAsDate = new Date();
  });
  document.getElementById('btn-cancelar-movimiento').addEventListener('click', () => {
    document.getElementById('form-movimiento').style.display = 'none';
    limpiarFormMovimiento();
  });
  document.getElementById('btn-guardar-movimiento').addEventListener('click', guardarMovimiento);

  // Notas
  document.getElementById('btn-agregar-nota').addEventListener('click', () => {
    document.getElementById('form-nota').style.display = 'flex';
  });
  document.getElementById('btn-cancelar-nota').addEventListener('click', () => {
    document.getElementById('form-nota').style.display = 'none';
    limpiarFormNota();
  });
  document.getElementById('btn-guardar-nota').addEventListener('click', guardarNota);

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('btn-editar').addEventListener('click', () => {
    window.location.href = '/pages/editar-evento?id=' + eventoActual.id;
  });

  document.getElementById('btn-exportar').addEventListener('click', exportarPDF);

});

// ── Progreso ──────────────────────────────────────

function renderizarProgreso(fechaEvento) {
  const hoy = new Date();
  const diasRestantes = Math.ceil((fechaEvento - hoy) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) { document.getElementById('progreso-wrapper').style.display = 'none'; return; }
  document.getElementById('progreso-dias').textContent = diasRestantes === 0 ? '¡Hoy!' : diasRestantes + ' días restantes';
  const porcentaje = Math.max(5, Math.min(100, 100 - (diasRestantes / 365 * 100)));
  const fill = document.getElementById('progreso-fill');
  fill.style.width = porcentaje + '%';
  if (diasRestantes <= 7) fill.style.background = '#D85A30';
  else if (diasRestantes <= 30) fill.style.background = '#EF9F27';
}

// ── Reuniones preview ─────────────────────────────

async function cargarReunionesPreview() {
  const hoy = new Date().toISOString().split('T')[0];
  const { data: reuniones } = await supabaseClient
    .from('reuniones').select('*')
    .eq('evento_id', eventoActual.id)
    .gte('fecha', hoy)
    .order('fecha').order('hora')
    .limit(3);

  const lista = document.getElementById('reunion-preview');
  if (!reuniones || reuniones.length === 0) {
    lista.innerHTML = `<div class="event-empty">No hay reuniones próximas. <a href="/pages/reuniones?id=${eventoActual.id}" style="color:#7F77DD;">Agregar</a></div>`;
    return;
  }

  lista.innerHTML = reuniones.map(r => {
    const fechaStr = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const esHoy = r.fecha === hoy;
    return `
      <div class="reunion-card ${esHoy ? 'hoy' : ''}" onclick="window.location.href='/pages/reuniones?id=${eventoActual.id}'">
        <div class="reunion-header">
          <div class="reunion-titulo">${r.titulo}</div>
          ${esHoy ? '<span class="reunion-hoy-tag">Hoy</span>' : ''}
        </div>
        <div class="reunion-fecha">${fechaStr} · ${r.hora.substring(0,5)}${r.lugar ? ' · 📍 ' + r.lugar : ''}</div>
      </div>
    `;
  }).join('');
}

// ── Reservas ──────────────────────────────────────

async function cargarReservas() {
  const { data: reservas } = await supabaseClient
    .from('reservas').select('*').eq('evento_id', eventoActual.id).order('created_at');

  const lista = document.getElementById('reserva-list');
  if (!reservas || reservas.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay reservas todavía.</div>';
    return;
  }

  lista.innerHTML = reservas.map(r => `
    <div class="reserva-card">
      <div class="reserva-header">
        <div class="reserva-nombre">${r.nombre}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="event-badge ${badges[r.estado] || 'badge-borrador'}">${etiquetas[r.estado] || 'Sin confirmar'}</span>
          <button class="btn-eliminar-nota" onclick="eliminarReserva('${r.id}')">✕</button>
        </div>
      </div>
      <div class="reserva-detalle">${r.contacto}${r.telefono ? ' · ' + r.telefono : ''}${r.email ? ' · ' + r.email : ''}</div>
      ${r.notas ? `<div class="reserva-notas">${r.notas}</div>` : ''}
    </div>
  `).join('');
}

function limpiarFormReserva() {
  ['res-nombre','res-contacto','res-telefono','res-email','res-notas'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('res-estado').value = 'borrador';
}

async function guardarReserva() {
  const nombre = document.getElementById('res-nombre').value.trim();
  const contacto = document.getElementById('res-contacto').value.trim();
  const telefono = document.getElementById('res-telefono').value.trim();
  const email = document.getElementById('res-email').value.trim();
  const estado = document.getElementById('res-estado').value;
  const notas = document.getElementById('res-notas').value.trim();

  if (!nombre) { toast('Por favor ingresá el servicio.', 'error'); return; }
  if (!contacto) { toast('Por favor ingresá el contacto.', 'error'); return; }

  const { error } = await supabaseClient.from('reservas').insert({
    evento_id: eventoActual.id, nombre, contacto, telefono, email, estado, notas
  });

  if (error) { toast('Error al guardar.', 'error'); return; }
  document.getElementById('form-reserva').style.display = 'none';
  limpiarFormReserva();
  await cargarReservas();
  toast('Reserva guardada');
}

async function eliminarReserva(resId) {
  if (!confirm('¿Eliminar esta reserva?')) return;
  await supabaseClient.from('reservas').delete().eq('id', resId);
  await cargarReservas();
  toast('Reserva eliminada');
}

// ── Movimientos ───────────────────────────────────

async function cargarMovimientos() {
  const { data: movimientos } = await supabaseClient
    .from('movimientos').select('*').eq('evento_id', eventoActual.id).order('fecha', { ascending: false });

  actualizarMetricasFinancieras(movimientos || []);

  const movList = document.getElementById('movimiento-list');
  if (!movimientos || movimientos.length === 0) {
    movList.innerHTML = '<div class="event-empty">No hay movimientos todavía.</div>';
    return;
  }

  movList.innerHTML = movimientos.map(m => `
    <div class="movimiento-card">
      <div class="movimiento-row">
        <span class="movimiento-concepto">${m.concepto}</span>
        <span class="movimiento-monto ${m.tipo}">
          ${m.tipo === 'egreso' ? '-' : '+'}$${m.monto.toLocaleString('es-AR')}
        </span>
      </div>
      <div class="movimiento-footer">
        <span class="movimiento-fecha">${new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
        <button class="btn-eliminar-nota" onclick="eliminarMovimiento('${m.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

function actualizarMetricasFinancieras(movimientos) {
  const gastado = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);
  const saldo = (eventoActual.presupuesto || 0) - gastado;
  document.getElementById('ev-presupuesto').textContent = '$' + (eventoActual.presupuesto || 0).toLocaleString('es-AR');
  document.getElementById('ev-gastado').textContent = '$' + gastado.toLocaleString('es-AR');
  document.getElementById('ev-saldo').textContent = '$' + saldo.toLocaleString('es-AR');
  document.getElementById('ev-saldo').style.color = saldo >= 0 ? '#1D9E75' : '#D85A30';
}

function limpiarFormMovimiento() {
  document.getElementById('mov-concepto').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-fecha').value = '';
  document.getElementById('mov-tipo').value = 'egreso';
}

async function guardarMovimiento() {
  const concepto = document.getElementById('mov-concepto').value.trim();
  const tipo = document.getElementById('mov-tipo').value;
  const monto = parseFloat(document.getElementById('mov-monto').value) || 0;
  const fecha = document.getElementById('mov-fecha').value;

  if (!concepto) { toast('Por favor ingresá un concepto.', 'error'); return; }
  if (!monto || monto <= 0) { toast('Por favor ingresá un monto válido.', 'error'); return; }
  if (!fecha) { toast('Por favor seleccioná una fecha.', 'error'); return; }

  const { error } = await supabaseClient.from('movimientos').insert({
    evento_id: eventoActual.id, concepto, tipo, monto, fecha
  });

  if (error) { toast('Error al guardar.', 'error'); return; }
  document.getElementById('form-movimiento').style.display = 'none';
  limpiarFormMovimiento();
  await cargarMovimientos();
  toast('Movimiento guardado');
}

async function eliminarMovimiento(movId) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  await supabaseClient.from('movimientos').delete().eq('id', movId);
  await cargarMovimientos();
  toast('Movimiento eliminado');
}

// ── Notas ─────────────────────────────────────────

async function cargarNotas() {
  const { data: notas } = await supabaseClient
    .from('notas').select('*').eq('evento_id', eventoActual.id).order('created_at');

  const notaList = document.getElementById('nota-list');
  if (!notas || notas.length === 0) {
    notaList.innerHTML = '<div class="event-empty">No hay notas todavía.</div>';
    return;
  }

  notaList.innerHTML = notas.map(n => `
    <div class="nota-card">
      <div class="nota-header">
        <div class="nota-titulo">${n.titulo}</div>
        <button class="btn-eliminar-nota" onclick="eliminarNota('${n.id}')">✕</button>
      </div>
      ${n.texto ? `<div class="nota-texto">${n.texto}</div>` : ''}
      ${n.imagen ? `<img src="${n.imagen}" class="nota-imagen" onclick="verImagen('${n.imagen}')" />` : ''}
      ${n.audio_url ? `
        <div class="nota-audio">
          <span class="nota-audio-nombre">🎵 ${n.audio_nombre}</span>
          <audio controls src="${n.audio_url}" style="width:100%;margin-top:6px;"></audio>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function limpiarFormNota() {
  document.getElementById('nota-titulo-input').value = '';
  document.getElementById('nota-texto-input').value = '';
  document.getElementById('nota-imagen-input').value = '';
  document.getElementById('nota-audio-input').value = '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function guardarNota() {
  const titulo = document.getElementById('nota-titulo-input').value.trim();
  const texto = document.getElementById('nota-texto-input').value.trim();
  const imagenInput = document.getElementById('nota-imagen-input');
  const audioInput = document.getElementById('nota-audio-input');

  if (!titulo) { toast('Por favor ingresá un título.', 'error'); return; }

  let imagen = null;
  let audio_url = null;
  let audio_nombre = null;

  if (imagenInput.files[0]) {
    imagen = await fileToBase64(imagenInput.files[0]);
  }
  if (audioInput.files[0]) {
    audio_url = await fileToBase64(audioInput.files[0]);
    audio_nombre = audioInput.files[0].name;
  }

  const { error } = await supabaseClient.from('notas').insert({
    evento_id: eventoActual.id, titulo, texto, imagen, audio_url, audio_nombre
  });

  if (error) { toast('Error al guardar.', 'error'); return; }
  document.getElementById('form-nota').style.display = 'none';
  limpiarFormNota();
  await cargarNotas();
  toast('Nota guardada');
}

async function eliminarNota(notaId) {
  if (!confirm('¿Eliminar esta nota?')) return;
  await supabaseClient.from('notas').delete().eq('id', notaId);
  await cargarNotas();
  toast('Nota eliminada');
}

function verImagen(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
  overlay.innerHTML = `<img src="${src}" style="max-width:90%;max-height:90%;border-radius:8px;" />`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ── PDF ───────────────────────────────────────────

async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const evento = eventoActual;
  const fecha = new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  const [{ data: movimientos }, { data: reservas }, { data: notas }, { data: reuniones }] = await Promise.all([
    supabaseClient.from('movimientos').select('*').eq('evento_id', evento.id),
    supabaseClient.from('reservas').select('*').eq('evento_id', evento.id),
    supabaseClient.from('notas').select('titulo, texto').eq('evento_id', evento.id),
    supabaseClient.from('reuniones').select('*').eq('evento_id', evento.id).order('fecha').order('hora')
  ]);

  const gastado = (movimientos || []).filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);
  const saldo = (evento.presupuesto || 0) - gastado;

  let y = 20;
  const nl = (n = 6) => { y += n; if (y > 270) { doc.addPage(); y = 20; } };

  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('DOT Eventos', 20, y); nl(10);
  doc.setFontSize(14);
  doc.text(evento.nombre, 20, y); nl(8);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
  doc.text(fecha + (evento.lugar ? ' · ' + evento.lugar : ''), 20, y); nl(6);
  if (evento.contacto_nombre) doc.text('Contacto: ' + evento.contacto_nombre + (evento.contacto_telefono ? ' · ' + evento.contacto_telefono : ''), 20, y);
  nl(12);

  doc.setDrawColor(200); doc.line(20, y, 190, y); nl(8);
  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Resumen financiero', 20, y); nl(8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Presupuesto: $' + (evento.presupuesto || 0).toLocaleString('es-AR'), 20, y); nl();
  doc.text('Gastado: $' + gastado.toLocaleString('es-AR'), 20, y); nl();
  doc.text('Saldo: $' + saldo.toLocaleString('es-AR'), 20, y); nl(12);

  if (reuniones?.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Reuniones', 20, y); nl(8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    reuniones.forEach(r => { doc.text(`${r.fecha} ${r.hora.substring(0,5)} — ${r.titulo}${r.lugar ? ' · ' + r.lugar : ''}`, 24, y); nl(); });
    nl(4);
  }

  if (movimientos?.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Movimientos', 20, y); nl(8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    movimientos.forEach(m => { doc.text(`${m.concepto} — ${m.tipo === 'egreso' ? '-' : '+'}$${m.monto.toLocaleString('es-AR')}`, 24, y); nl(); });
    nl(4);
  }

  if (reservas?.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Reservas', 20, y); nl(8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    reservas.forEach(r => { doc.text(`${r.nombre} — ${r.contacto}${r.telefono ? ' · ' + r.telefono : ''}`, 24, y); nl(); });
    nl(4);
  }

  if (notas?.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Notas', 20, y); nl(8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    notas.forEach(n => { doc.text(`${n.titulo}${n.texto ? ': ' + n.texto.substring(0, 80) : ''}`, 24, y); nl(); });
  }

  doc.save(evento.nombre.replace(/ /g, '-') + '.pdf');
  toast('PDF descargado');
}