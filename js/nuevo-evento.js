document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btn-guardar').addEventListener('click', () => {

    const nombre = document.getElementById('nombre').value.trim();
    const fecha = document.getElementById('fecha').value;
    const estado = document.getElementById('estado').value;
    const lugar = document.getElementById('lugar').value.trim();
    const presupuesto = parseFloat(document.getElementById('presupuesto').value) || 0;
    const notas = document.getElementById('notas').value.trim();

    // Validación básica
    if (!nombre) {
      alert('Por favor ingresá el nombre del evento.');
      return;
    }
    if (!fecha) {
      alert('Por favor seleccioná una fecha.');
      return;
    }

    // Por ahora guardamos en localStorage hasta conectar Supabase
    const eventos = JSON.parse(localStorage.getItem('dot-eventos') || '[]');

    const nuevoEvento = {
      id: Date.now(),
      nombre,
      fecha,
      estado,
      lugar,
      presupuesto,
      notas,
      creado: new Date().toISOString()
    };

    eventos.push(nuevoEvento);
    localStorage.setItem('dot-eventos', JSON.stringify(eventos));

    alert('¡Evento guardado!');
    window.location.href = 'dashboard.html';
  });

});