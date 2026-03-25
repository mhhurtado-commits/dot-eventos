const eventos = [
  { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000 },
  { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000 },
  { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000 },
  { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000 }
];

const colores = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30', '#378ADD'];
const badges = { confirmado: 'badge-confirmado', progreso: 'badge-progreso', borrador: 'badge-borrador' };
const etiquetas = { confirmado: 'Confirmado', progreso: 'En progreso', borrador: 'Borrador' };

let eventoActual = null;

function toast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
}

document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  const eventosGuardados = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
  const todosLosEventos = [...eventos, ...eventosGuardados];
  const evento = todosLosEventos.find(e => e.id === id) || eventos[0];
  const idx = todosLosEventos.findIndex(e => e.id === evento.id);
  eventoActual = evento;

  // Encabezado
  const color = colores[idx % colores.length];
  document.getElementById('evento-dot').style.background = color;
  document.getElementById('evento-titulo').textContent = evento.nombre;

  const fecha = new Date(evento.fecha);
  const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const lugar = evento.lugar ? ' · ' + evento.lugar : '';
  document.getElementById('evento-meta').textContent = fechaStr + lugar;

  const badge = document.getElementById('evento-badge');
  badge.textContent = etiquetas[evento.estado] || 'Borrador';
  badge.className = 'event-badge ' + (badges[evento.estado] || 'badge-borrador');

  // Barra de progreso
  renderizarProgreso(fecha);

  // Info
  document.getElementById('info-nombre').textContent = evento.nombre;
  document.getElementById('info-fecha').textContent = fechaStr;
  document.getElementById('info-lugar').textContent = evento.lugar || '—';
  document.getElementById('info-estado').textContent = etiquetas[evento.estado] || 'Borrador';

  // Reuniones
  renderizarReunionesPreview();
  document.getElementById('btn-ir-reuniones').addEventListener('click', () => {
    window.location.href = '/pages/reuniones?id=' + eventoActual.id;
  });

  // Reservas
  renderizarReservas();
  document.getElementById('btn-agregar-reserva').addEventListener('click', () => {
    document.getElementById('form-reserva').style.display = 'flex';
  });
  document.getElementById('btn-cancelar-reserva').addEventListener('click', () => {
    document.getElementById('form-reserva').style.display = 'none';
    limpiarFormReserva();
  });
  document.getElementById('btn-guardar-reserva').addEventListener('click', () => {
    const nombre = document.getElementById('res-nombre').value.trim();
    const contacto = document.getElementById('res-contacto').value.trim();
    const telefono = document.getElementById('res-telefono').value.trim();
    const email = document.getElementById('res-email').value.trim();
    const estado = document.getElementById('res-estado').value;
    const notas = document.getElementById('res-notas').value.trim();

    if (!nombre) { toast('Por favor ingresá el servicio.', 'error'); return; }
    if (!contacto) { toast('Por favor ingresá el contacto.', 'error'); return; }

    const clave = 'dot-reservas-' + eventoActual.id;
    const reservas = JSON.parse(localStorage.getItem(clave) || '[]');
    reservas.push({ id: Date.now(), nombre, contacto, telefono, email, estado, notas });
    localStorage.setItem(clave, JSON.stringify(reservas));

    document.getElementById('form-reserva').style.display = 'none';
    limpiarFormReserva();
    renderizarReservas();
    toast('Reserva guardada');
  });

  // Movimientos
  renderizarMovimientos();
  actualizarMetricas();

  document.getElementById('btn-agregar-movimiento').addEventListener('click', () => {
    document.getElementById('form-movimiento').style.display = 'flex';
    document.getElementById('mov-fecha').valueAsDate = new Date();
  });
  document.getElementById('btn-cancelar-movimiento').addEventListener('click', () => {
    document.getElementById('form-movimiento').style.display = 'none';
    limpiarFormMovimiento();
  });
  document.getElementById('btn-guardar-movimiento').addEventListener('click', () => {
    const concepto = document.getElementById('mov-concepto').value.trim();
    const tipo = document.getElementById('mov-tipo').value;
    const monto = parseFloat(document.getElementById('mov-monto').value) || 0;
    const fecha = document.getElementById('mov-fecha').value;

    if (!concepto) { toast('Por favor ingresá un concepto.', 'error'); return; }
    if (!monto || monto <= 0) { toast('Por favor ingresá un monto válido.', 'error'); return; }
    if (!fecha) { toast('Por favor seleccioná una fecha.', 'error'); return; }

    const clave = 'dot-movimientos-' + eventoActual.id;
    const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');
    movimientos.push({ id: Date.now(), concepto, tipo, monto, fecha });
    localStorage.setItem(clave, JSON.stringify(movimientos));

    document.getElementById('form-movimiento').style.display = 'none';
    limpiarFormMovimiento();
    renderizarMovimientos();
    actualizarMetricas();
    toast('Movimiento guardado');
  });

  // Notas
  renderizarNotas();
  document.getElementById('btn-agregar-nota').addEventListener('click', () => {
    document.getElementById('form-nota').style.display = 'flex';
  });
  document.getElementById('btn-cancelar-nota').addEventListener('click', () => {
    document.getElementById('form-nota').style.display = 'none';
    document.getElementById('nota-titulo-input').value = '';
    document.getElementById('nota-texto-input').value = '';
    document.getElementById('nota-imagen-input').value = '';
    document.getElementById('nota-audio-input').value = '';
  });
  document.getElementById('btn-guardar-nota').addEventListener('click', async () => {
    const titulo = document.getElementById('nota-titulo-input').value.trim();
    const texto = document.getElementById('nota-texto-input').value.trim();
    const imagenInput = document.getElementById('nota-imagen-input');
    const audioInput = document.getElementById('nota-audio-input');

    if (!titulo) { toast('Por favor ingresá un título.', 'error'); return; }

    let imagenData = null;
    let audioData = null;

    if (imagenInput.files[0]) {
      imagenData = await fileToBase64(imagenInput.files[0]);
    }
    if (audioInput.files[0]) {
      const audioBase64 = await fileToBase64(audioInput.files[0]);
      audioData = { url: audioBase64, nombre: audioInput.files[0].name };
    }

    const clave = 'dot-notas-' + eventoActual.id;
    const notas = JSON.parse(localStorage.getItem(clave) || '[]');
    notas.push({ id: Date.now(), titulo, texto, imagen: imagenData, audio: audioData });
    localStorage.setItem(clave, JSON.stringify(notas));

    document.getElementById('form-nota').style.display = 'none';
    document.getElementById('nota-titulo-input').value = '';
    document.getElementById('nota-texto-input').value = '';
    document.getElementById('nota-imagen-input').value = '';
    document.getElementById('nota-audio-input').value = '';
    renderizarNotas();
    toast('Nota guardada');
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Editar
  document.getElementById('btn-editar').addEventListener('click', () => {
    window.location.href = '/pages/editar-evento?id=' + evento.id;
  });

  // PDF
  document.getElementById('btn-exportar').addEventListener('click', () => exportarPDF());

});

// ── Progreso ──────────────────────────────────────

function renderizarProgreso(fechaEvento) {
  const hoy = new Date();
  const diasRestantes = Math.ceil((fechaEvento - hoy) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    document.getElementById('progreso-wrapper').style.display = 'none';
    return;
  }

  document.getElementById('progreso-dias').textContent = diasRestantes === 0 ? '¡Hoy!' : diasRestantes + ' días restantes';
  document.getElementById('progreso-label').textContent = 'Cuenta regresiva';

  const totalDias = 365;
  const porcentaje = Math.max(0, Math.min(100, 100 - (diasRestantes / totalDias * 100)));
  document.getElementById('progreso-fill').style.width = porcentaje + '%';

  if (diasRestantes <= 7) {
    document.getElementById('progreso-fill').style.background = '#D85A30';
  } else if (diasRestantes <= 30) {
    document.getElementById('progreso-fill').style.background = '#EF9F27';
  }
}

// ── Reuniones preview ─────────────────────────────

function renderizarReunionesPreview() {
  const clave = 'dot-reuniones-' + eventoActual.id;
  const reuniones = JSON.parse(localStorage.getItem(clave) || '[]');
  const lista = document.getElementById('reunion-preview');

  if (reuniones.length === 0) {
    lista.innerHTML = `<div class="event-empty">No hay reuniones. <a href="/pages/reuniones?id=${eventoActual.id}" style="color:#7F77DD;">Agregar</a></div>`;
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];
  const proximas = reuniones
    .filter(r => r.fecha >= hoy)
    .sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora))
    .slice(0, 3);

  if (proximas.length === 0) {
    lista.innerHTML = `<div class="event-empty">No hay reuniones próximas. <a href="/pages/reuniones?id=${eventoActual.id}" style="color:#7F77DD;">Ver todas</a></div>`;
    return;
  }

  lista.innerHTML = proximas.map(r => {
    const fecha = new Date(r.fecha + 'T' + r.hora);
    const fechaStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const esHoy = r.fecha === hoy;

    return `
      <div class="reunion-card ${esHoy ? 'hoy' : ''}" onclick="window.location.href='/pages/reuniones?id=${eventoActual.id}'">
        <div class="reunion-header">
          <div class="reunion-titulo">${r.titulo}</div>
          ${esHoy ? '<span class="reunion-hoy-tag">Hoy</span>' : ''}
        </div>
        <div class="reunion-fecha">${fechaStr} · ${horaStr}${r.lugar ? ' · 📍 ' + r.lugar : ''}</div>
      </div>
    `;
  }).join('');
}

// ── Reservas ──────────────────────────────────────

function limpiarFormReserva() {
  ['res-nombre', 'res-contacto', 'res-telefono', 'res-email', 'res-notas'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('res-estado').value = 'borrador';
}

function renderizarReservas() {
  const clave = 'dot-reservas-' + eventoActual.id;
  const reservas = JSON.parse(localStorage.getItem(clave) || '[]');
  const lista = document.getElementById('reserva-list');

  if (reservas.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay reservas todavía.</div>';
    return;
  }

  lista.innerHTML = reservas.map(r => `
    <div class="reserva-card">
      <div class="reserva-header">
        <div class="reserva-nombre">${r.nombre}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="event-badge ${badges[r.estado] || 'badge-borrador'}">${etiquetas[r.estado] || 'Sin confirmar'}</span>
          <button class="btn-eliminar-nota" onclick="eliminarReserva(${r.id})">✕</button>
        </div>
      </div>
      <div class="reserva-detalle">${r.contacto}${r.telefono ? ' · ' + r.telefono : ''}${r.email ? ' · ' + r.email : ''}</div>
      ${r.notas ? `<div class="reserva-notas">${r.notas}</div>` : ''}
    </div>
  `).join('');
}

function eliminarReserva(resId) {
  if (!confirm('¿Eliminar esta reserva?')) return;
  const clave = 'dot-reservas-' + eventoActual.id;
  const reservas = JSON.parse(localStorage.getItem(clave) || '[]');
  localStorage.setItem(clave, JSON.stringify(reservas.filter(r => r.id !== resId)));
  renderizarReservas();
  toast('Reserva eliminada');
}

// ── Movimientos ───────────────────────────────────

function limpiarFormMovimiento() {
  document.getElementById('mov-concepto').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-fecha').value = '';
  document.getElementById('mov-tipo').value = 'egreso';
}

function actualizarMetricas() {
  const clave = 'dot-movimientos-' + eventoActual.id;
  const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');

  const gastado = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0);
  const saldo = (eventoActual.presupuesto || 0) - gastado;

  document.getElementById('ev-presupuesto').textContent = '$' + (eventoActual.presupuesto || 0).toLocaleString('es-AR');
  document.getElementById('ev-gastado').textContent = '$' + gastado.toLocaleString('es-AR');
  document.getElementById('ev-saldo').textContent = '$' + saldo.toLocaleString('es-AR');
  document.getElementById('ev-saldo').style.color = saldo >= 0 ? '#1D9E75' : '#D85A30';
}

function renderizarMovimientos() {
  const clave = 'dot-movimientos-' + eventoActual.id;
  const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');
  const movList = document.getElementById('movimiento-list');

  if (movimientos.length === 0) {
    movList.innerHTML = '<div class="event-empty">No hay movimientos todavía.</div>';
    return;
  }

  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  movList.innerHTML = movimientos.map(m => `
    <div class="movimiento-card">
      <div class="movimiento-row">
        <span class="movimiento-concepto">${m.concepto}</span>
        <span class="movimiento-monto ${m.tipo}">
          ${m.tipo === 'egreso' ? '-' : '+'}$${m.monto.toLocaleString('es-AR')}
        </span>
      </div>
      <div class="movimiento-footer">
        <span class="movimiento-fecha">${new Date(m.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
        <button class="btn-eliminar-nota" onclick="eliminarMovimiento(${m.id})">✕</button>
      </div>
    </div>
  `).join('');
}

function eliminarMovimiento(movId) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  const clave = 'dot-movimientos-' + eventoActual.id;
  const movimientos = JSON.parse(localStorage.getItem(clave) || '[]');
  localStorage.setItem(clave, JSON.stringify(movimientos.filter(m => m.id !== movId)));
  renderizarMovimientos();
  actualizarMetricas();
  toast('Movimiento eliminado');
}

// ── Notas ─────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderizarNotas() {
  const clave = 'dot-notas-' + eventoActual.id;
  const notas = JSON.parse(localStorage.getItem(clave) || '[]');
  const notaList = document.getElementById('nota-list');

  if (notas.length === 0) {
    notaList.innerHTML = '<div class="event-empty">No hay notas todavía.</div>';
    return;
  }

  notaList.innerHTML = notas.map(n => `
    <div class="nota-card">
      <div class="nota-header">
        <div class="nota-titulo">${n.titulo}</div>
        <button class="btn-eliminar-nota" onclick="eliminarNota(${n.id})">✕</button>
      </div>
      ${n.texto ? `<div class="nota-texto">${n.texto}</div>` : ''}
      ${n.imagen ? `<img src="${n.imagen}" class="nota-imagen" onclick="verImagen('${n.imagen}')" />` : ''}
      ${n.audio ? `
        <div class="nota-audio">
          <span class="nota-audio-nombre">🎵 ${n.audio.nombre}</span>
          <audio controls src="${n.audio.url}" style="width:100%;margin-top:6px;"></audio>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function eliminarNota(notaId) {
  if (!confirm('¿Eliminar esta nota?')) return;
  const clave = 'dot-notas-' + eventoActual.id;
  const notas = JSON.parse(localStorage.getItem(clave) || '[]');
  localStorage.setItem(clave, JSON.stringify(notas.filter(n => n.id !== notaId)));
  renderizarNotas();
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

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const evento = eventoActual;
  const fecha = new Date(evento.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  const movimientos = JSON.parse(localStorage.getItem('dot-movimientos-' + evento.id) || '[]');
  const reservas = JSON.parse(localStorage.getItem('dot-reservas-' + evento.id) || '[]');
  const notas = JSON.parse(localStorage.getItem('dot-notas-' + evento.id) || '[]');
  const reuniones = JSON.parse(localStorage.getItem('dot-reuniones-' + evento.id) || '[]');
  const gastado = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);
  const saldo = (evento.presupuesto || 0) - gastado;

  let y = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DOT Eventos', 20, y); y += 10;

  doc.setFontSize(14);
  doc.text(evento.nombre, 20, y); y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(fecha + (evento.lugar ? ' · ' + evento.lugar : ''), 20, y); y += 14;

  doc.setDrawColor(200);
  doc.line(20, y, 190, y); y += 8;

  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumen financiero', 20, y); y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Presupuesto: $' + (evento.presupuesto || 0).toLocaleString('es-AR'), 20, y); y += 6;
  doc.text('Gastado: $' + gastado.toLocaleString('es-AR'), 20, y); y += 6;
  doc.text('Saldo: $' + saldo.toLocaleString('es-AR'), 20, y); y += 12;

  if (reuniones.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Reuniones', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    reuniones.forEach(r => {
      doc.text(`${r.fecha} ${r.hora} — ${r.titulo}${r.lugar ? ' · ' + r.lugar : ''}`, 24, y); y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  if (movimientos.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Movimientos', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    movimientos.forEach(m => {
      const signo = m.tipo === 'egreso' ? '-' : '+';
      doc.text(`${m.concepto} — ${signo}$${m.monto.toLocaleString('es-AR')}`, 24, y); y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  if (reservas.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Reservas', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    reservas.forEach(r => {
      doc.text(`${r.nombre} — ${r.contacto}${r.telefono ? ' · ' + r.telefono : ''}`, 24, y); y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  if (notas.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Notas', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    notas.forEach(n => {
      doc.text(`${n.titulo}${n.texto ? ': ' + n.texto : ''}`, 24, y); y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  doc.save(evento.nombre.replace(/ /g, '-') + '.pdf');
  toast('PDF descargado');
}