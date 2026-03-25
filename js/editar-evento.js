let eventoId = null;

document.addEventListener('DOMContentLoaded', async () => {

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = '/'; return; }

  const params = new URLSearchParams(window.location.search);
  eventoId = params.get('id');

  const { data: evento, error } = await supabaseClient
    .from('eventos').select('*').eq('id', eventoId).single();

  if (error || !evento) { alert('Evento no encontrado.'); window.location.href = '/pages/dashboard'; return; }

  document.getElementById('subtitulo').textContent = evento.nombre;
  document.getElementById('tipo').value = evento.tipo || 'otro';
  document.getElementById('nombre').value = evento.nombre;
  document.getElementById('fecha').value = evento.fecha;
  document.getElementById('estado').value = evento.estado;
  document.getElementById('lugar').value = evento.lugar || '';
  document.getElementById('presupuesto').value = evento.presupuesto || '';
  document.getElementById('notas').value = evento.notas || '';
  document.getElementById('contacto_nombre').value = evento.contacto_nombre || '';
  document.getElementById('contacto_telefono').value = evento.contacto_telefono || '';
  document.getElementById('contacto_email').value = evento.contacto_email || '';
  document.getElementById('contacto_direccion').value = evento.contacto_direccion || '';

  document.getElementById('btn-volver').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + eventoId;
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + eventoId;
  });

  document.getElementById('btn-guardar').addEventListener('click', async () => {
    const nombre = document.getElementById('nombre').value.trim();
    const tipo = document.getElementById('tipo').value;
    const fecha = document.getElementById('fecha').value;
    const estado = document.getElementById('estado').value;
    const lugar = document.getElementById('lugar').value.trim();
    const presupuesto = parseFloat(document.getElementById('presupuesto').value) || 0;
    const notas = document.getElementById('notas').value.trim();
    const contacto_nombre = document.getElementById('contacto_nombre').value.trim();
    const contacto_telefono = document.getElementById('contacto_telefono').value.trim();
    const contacto_email = document.getElementById('contacto_email').value.trim();
    const contacto_direccion = document.getElementById('contacto_direccion').value.trim();

    if (!nombre) { alert('Por favor ingresá el nombre del evento.'); return; }
    if (!fecha) { alert('Por favor seleccioná una fecha.'); return; }
    if (!contacto_nombre) { alert('Por favor ingresá el nombre del contacto.'); return; }
    if (!contacto_telefono) { alert('Por favor ingresá el teléfono del contacto.'); return; }

    const { error } = await supabaseClient.from('eventos').update({
      nombre, tipo, fecha, estado, lugar, presupuesto, notas,
      contacto_nombre, contacto_telefono, contacto_email, contacto_direccion
    }).eq('id', eventoId);

    if (error) { alert('Error al guardar: ' + error.message); return; }
    window.location.href = '/pages/evento?id=' + eventoId;
  });

  document.getElementById('btn-eliminar').addEventListener('click', async () => {
    if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
    const { error } = await supabaseClient.from('eventos').delete().eq('id', eventoId);
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    window.location.href = '/pages/dashboard';
  });

});