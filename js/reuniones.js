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

  const { data: evento } = await supabaseClient
    .from('eventos').select('*').eq('id', id).single();

  eventoActual = evento;
  document.getElementById('evento-subtitulo').textContent = evento?.nombre || '—';

  document.getElementById('btn-volver').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + id;
  });

  document.getElementById('btn-agregar').addEventListener('click', () => {
    document.getElementById('form-reunion').style.display = 'flex';
    document.getElementById('reu-fecha').valueAsDate = new Date();
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => {
    document.getElementById('form-reunion').style.display = 'none';
    limpiarForm();
  });

  document.getElementById('btn-guardar').addEventListener('click', guardarReunion);

  await cargarReuniones();
});

function limpiarForm() {
  ['reu-titulo','reu-fecha','reu-hora','reu-lugar','reu-descripcion'].forEach(id => document.getElementById(id).value = '');
}

async function guardarReunion() {
  const titulo = document.getElementById('reu-titulo').value.trim();
  const fecha = document.getElementById('reu-fecha').value;
  const hora = document.getElementById('reu-hora').value;
  const lugar = document.getElementById('reu-lugar').value.trim();
  const descripcion = document.getElementById('reu-descripcion').value.trim();

  if (!titulo) { toast('Por favor ingresá un título.', 'error'); return; }
  if (!fecha) { toast('Por favor seleccioná una fecha.', 'error'); return; }
  if (!hora) { toast('Por favor seleccioná una hora.', 'error'); return; }

  const { error } = await supabaseClient.from('reuniones').insert({
    evento_id: eventoActual.id, titulo, fecha, hora, lugar, descripcion
  });

  if (error) { toast('Error al guardar.', 'error'); return; }
  document.getElementById('form-reunion').style.display = 'none';
  limpiarForm();
  await cargarReuniones();
  toast('Reunión guardada');
}

async function cargarReuniones() {
  const { data: reuniones } = await supabaseClient
    .from('reuniones').select('*').eq('evento_id', eventoActual.id)
    .order('fecha').order('hora');

  const lista = document.getElementById('reunion-list');
  if (!reuniones || reuniones.length === 0) {
    lista.innerHTML = '<div class="event-empty">No hay reuniones todavía.</div>';
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];

  lista.innerHTML = reuniones.map(r => {
    const fechaStr = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const esHoy = r.fecha === hoy;
    const esPasada = r.fecha < hoy;

    return `
      <div class="reunion-card ${esPasada ? 'pasada' : ''} ${esHoy ? 'hoy' : ''}">
        <div class="reunion-header">
          <div class="reunion-titulo">${r.titulo}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${esHoy ? '<span class="reunion-hoy-tag">Hoy</span>' : ''}
            <button class="btn-eliminar-nota" onclick="eliminarReunion('${r.id}')">✕</button>
          </div>
        </div>
        <div class="reunion-meta">
          <span class="reunion-fecha">${fechaStr} · ${r.hora.substring(0,5)}</span>
          ${r.lugar ? `<span class="reunion-lugar">📍 ${r.lugar}</span>` : ''}
        </div>
        ${r.descripcion ? `<div class="reunion-descripcion">${r.descripcion}</div>` : ''}
      </div>
    `;
  }).join('');
}

async function eliminarReunion(rId) {
  if (!confirm('¿Eliminar esta reunión?')) return;
  await supabaseClient.from('reuniones').delete().eq('id', rId);
  await cargarReuniones();
  toast('Reunión eliminada');
}