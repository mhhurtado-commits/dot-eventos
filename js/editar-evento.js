const eventosPrueba = [
  { id: 1, nombre: 'Casamiento García', fecha: '2026-04-15', lugar: 'Salón Los Aromos', estado: 'confirmado', presupuesto: 320000, notas: '' },
  { id: 2, nombre: 'Cumpleaños 15 Martina', fecha: '2026-04-28', lugar: 'Club Andino', estado: 'progreso', presupuesto: 180000, notas: '' },
  { id: 3, nombre: 'Reunión corporativa TechCorp', fecha: '2026-05-10', lugar: 'Hotel Diplomático', estado: 'progreso', presupuesto: 210000, notas: '' },
  { id: 4, nombre: 'Aniversario Empresa DOT', fecha: '2026-06-22', lugar: '', estado: 'borrador', presupuesto: 130000, notas: '' }
];

document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  const eventosGuardados = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
  const todosLosEventos = [...eventosPrueba, ...eventosGuardados];
  const evento = todosLosEventos.find(e => e.id === id);

  if (!evento) {
    alert('Evento no encontrado.');
    window.location.href = '/pages/dashboard';
    return;
  }

  document.getElementById('btn-volver').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + id;
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + id;
  });

  document.getElementById('subtitulo').textContent = evento.nombre;
  document.getElementById('nombre').value = evento.nombre;
  document.getElementById('fecha').value = evento.fecha;
  document.getElementById('estado').value = evento.estado;
  document.getElementById('lugar').value = evento.lugar || '';
  document.getElementById('presupuesto').value = evento.presupuesto || '';
  document.getElementById('notas').value = evento.notas || '';

  document.getElementById('btn-guardar').addEventListener('click', () => {

    const nombre = document.getElementById('nombre').value.trim();
    const fecha = document.getElementById('fecha').value;
    const estado = document.getElementById('estado').value;
    const lugar = document.getElementById('lugar').value.trim();
    const presupuesto = parseFloat(document.getElementById('presupuesto').value) || 0;
    const notas = document.getElementById('notas').value.trim();

    if (!nombre) {
      alert('Por favor ingresá el nombre del evento.');
      return;
    }
    if (!fecha) {
      alert('Por favor seleccioná una fecha.');
      return;
    }

    const eventosLS = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
    const idx = eventosLS.findIndex(e => e.id === id);

    if (idx !== -1) {
      eventosLS[idx] = { ...eventosLS[idx], nombre, fecha, estado, lugar, presupuesto, notas };
      localStorage.setItem('dot-eventos', JSON.stringify(eventosLS));
    }

    alert('¡Cambios guardados!');
    window.location.href = '/pages/evento?id=' + id;
  });

  document.getElementById('btn-eliminar').addEventListener('click', () => {
    if (!confirm('¿Estás seguro que querés eliminar este evento?')) return;

    const eventosLS = JSON.parse(localStorage.getItem('dot-eventos') || '[]');
    const nuevosEventos = eventosLS.filter(e => e.id !== id);
    localStorage.setItem('dot-eventos', JSON.stringify(nuevosEventos));

    alert('Evento eliminado.');
    window.location.href = '/pages/dashboard';
  });

});