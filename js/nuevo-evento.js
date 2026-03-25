document.addEventListener('DOMContentLoaded', async () => {

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = '/'; return; }

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

    const { error } = await supabaseClient.from('eventos').insert({
      nombre, tipo, fecha, estado, lugar, presupuesto, notas,
      contacto_nombre, contacto_telefono, contacto_email, contacto_direccion,
      user_id: session.user.id
    });

    if (error) { alert('Error al guardar: ' + error.message); return; }

    window.location.href = '/pages/dashboard';
  });

});