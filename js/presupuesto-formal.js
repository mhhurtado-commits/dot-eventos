let eventoActual = null;
let plantillaActual = 'clasica';
let items = [];

const tiposLabel = {
  cumpleanos_15: 'Cumpleaños 15', cumpleanos_18: 'Cumpleaños 18',
  boda: 'Boda', corporativo: 'Corporativo',
  alquiler: 'Alquiler de mobiliario', otro: 'Evento'
};

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
  const eventoId = params.get('id');

  const { data: evento } = await supabaseClient
    .from('eventos').select('*').eq('id', eventoId).single();

  if (!evento) { window.location.href = '/pages/dashboard'; return; }
  eventoActual = evento;

  document.getElementById('evento-subtitulo').textContent = evento.nombre;
  document.getElementById('btn-volver').addEventListener('click', () => {
    window.location.href = '/pages/evento?id=' + eventoId;
  });

  // Precargar datos del evento
  const fechaEvento = new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('cli-nombre').value = evento.contacto_nombre || '';
  document.getElementById('cli-telefono').value = evento.contacto_telefono || '';
  document.getElementById('cli-email').value = evento.contacto_email || '';
  document.getElementById('cli-direccion').value = evento.contacto_direccion || '';
  document.getElementById('ev-tipo').value = tiposLabel[evento.tipo] || 'Evento';
  document.getElementById('ev-fecha').value = fechaEvento;
  document.getElementById('ev-lugar').value = evento.lugar || '';

  // Número automático
  const numero = 'PRES-' + new Date().getFullYear() + '-' + String(eventoId).padStart(3, '0');
  document.getElementById('pres-numero').value = numero;
  document.getElementById('pres-validez').value = '15 días hábiles';
  document.getElementById('pres-intro').value = `En respuesta a su consulta, nos es grato presentarle el siguiente presupuesto para la organización de su ${tiposLabel[evento.tipo] || 'evento'}.\n\nQuedamos a su disposición para cualquier consulta o modificación.`;
  document.getElementById('pres-notas').value = 'Los precios expresados son en pesos argentinos.\nSe requiere una seña del 30% para confirmar la reserva.\nEl saldo restante deberá abonarse 48hs antes del evento.';

  // Cargar presupuesto guardado si existe
  const { data: presGuardado } = await supabaseClient
    .from('presupuestos').select('*').eq('evento_id', eventoId).single();

  if (presGuardado) {
    plantillaActual = presGuardado.plantilla || 'clasica';
    items = presGuardado.items || [];
    document.getElementById('pres-numero').value = presGuardado.numero || numero;
    document.getElementById('pres-validez').value = presGuardado.validez || '15 días hábiles';
    document.getElementById('pres-intro').value = presGuardado.intro || '';
    document.getElementById('pres-notas').value = presGuardado.notas_finales || '';
    document.getElementById('pres-descuento').value = presGuardado.descuento || 0;
    document.getElementById('pres-iva').checked = presGuardado.incluye_iva || false;
    seleccionarPlantilla(plantillaActual);
  } else {
    items = [
      { desc: 'Coordinación general del evento', cant: 1, precio: 0 },
      { desc: 'Decoración y ambientación', cant: 1, precio: 0 },
    ];
  }

  renderizarItems();
  actualizarTotales();
  actualizarPreview();

  // Plantillas
  document.querySelectorAll('.plantilla-btn').forEach(btn => {
    btn.addEventListener('click', () => seleccionarPlantilla(btn.dataset.plantilla));
  });

  // Agregar ítem
  document.getElementById('btn-agregar-item').addEventListener('click', () => {
    items.push({ desc: '', cant: 1, precio: 0 });
    renderizarItems();
    actualizarTotales();
  });

  // Cambios en inputs → actualizar preview
  ['pres-numero','pres-validez','pres-intro','pres-notas','pres-descuento',
   'cli-nombre','cli-telefono','cli-email','cli-direccion',
   'ev-tipo','ev-fecha','ev-lugar'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      actualizarTotales();
      actualizarPreview();
    });
  });
  document.getElementById('pres-iva').addEventListener('change', () => {
    actualizarTotales();
    actualizarPreview();
  });

  // Guardar
  document.getElementById('btn-guardar').addEventListener('click', guardarPresupuesto);

  // PDF
  document.getElementById('btn-pdf').addEventListener('click', exportarPDF);

});

function seleccionarPlantilla(plantilla) {
  plantillaActual = plantilla;
  document.querySelectorAll('.plantilla-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.plantilla === plantilla);
  });
  actualizarPreview();
}

function renderizarItems() {
  const lista = document.getElementById('items-lista');
  lista.innerHTML = items.map((item, i) => `
    <div class="item-row">
      <input type="text" class="form-input item-desc" value="${item.desc}" placeholder="Descripción del servicio"
        onchange="items[${i}].desc=this.value;actualizarPreview()" />
      <input type="number" class="form-input item-cant" value="${item.cant}" min="1"
        onchange="items[${i}].cant=parseFloat(this.value)||1;actualizarTotales();actualizarPreview()" />
      <input type="number" class="form-input item-precio" value="${item.precio}" min="0" placeholder="0"
        onchange="items[${i}].precio=parseFloat(this.value)||0;actualizarTotales();actualizarPreview()" />
      <span class="item-subtotal">$${((item.cant||1)*(item.precio||0)).toLocaleString('es-AR')}</span>
      <button class="btn-eliminar-nota" onclick="eliminarItem(${i})">✕</button>
    </div>
  `).join('');
}

function eliminarItem(i) {
  items.splice(i, 1);
  renderizarItems();
  actualizarTotales();
  actualizarPreview();
}

function actualizarTotales() {
  const subtotal = items.reduce((a, item) => a + (item.cant || 1) * (item.precio || 0), 0);
  const descPct = parseFloat(document.getElementById('pres-descuento').value) || 0;
  const descMonto = subtotal * (descPct / 100);
  const subtotalConDesc = subtotal - descMonto;
  const incluyeIva = document.getElementById('pres-iva').checked;
  const iva = incluyeIva ? subtotalConDesc * 0.21 : 0;
  const total = subtotalConDesc + iva;

  document.getElementById('total-subtotal').textContent = '$' + subtotal.toLocaleString('es-AR');
  document.getElementById('total-iva').textContent = '$' + iva.toLocaleString('es-AR');
  document.getElementById('total-final').textContent = '$' + total.toLocaleString('es-AR');

  // Actualizar subtotales en items
  document.querySelectorAll('.item-subtotal').forEach((el, i) => {
    if (items[i]) el.textContent = '$' + ((items[i].cant || 1) * (items[i].precio || 0)).toLocaleString('es-AR');
  });
}

function actualizarPreview() {
  const preview = document.getElementById('pres-preview');
  preview.className = 'pres-preview plantilla-' + plantillaActual;

  const numero = document.getElementById('pres-numero').value;
  const validez = document.getElementById('pres-validez').value;
  const intro = document.getElementById('pres-intro').value;
  const notas = document.getElementById('pres-notas').value;
  const cliNombre = document.getElementById('cli-nombre').value;
  const cliTel = document.getElementById('cli-telefono').value;
  const cliEmail = document.getElementById('cli-email').value;
  const cliDir = document.getElementById('cli-direccion').value;
  const evTipo = document.getElementById('ev-tipo').value;
  const evFecha = document.getElementById('ev-fecha').value;
  const evLugar = document.getElementById('ev-lugar').value;

  const subtotal = items.reduce((a, item) => a + (item.cant || 1) * (item.precio || 0), 0);
  const descPct = parseFloat(document.getElementById('pres-descuento').value) || 0;
  const descMonto = subtotal * (descPct / 100);
  const subtotalConDesc = subtotal - descMonto;
  const incluyeIva = document.getElementById('pres-iva').checked;
  const iva = incluyeIva ? subtotalConDesc * 0.21 : 0;
  const total = subtotalConDesc + iva;

  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  preview.innerHTML = generarHTMLPresupuesto({
    numero, validez, intro, notas, cliNombre, cliTel, cliEmail, cliDir,
    evTipo, evFecha, evLugar, subtotal, descPct, descMonto, iva, total, hoy,
    plantilla: plantillaActual
  });
}

function generarHTMLPresupuesto(d) {
  const logoSVG = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#7F77DD"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
    <circle cx="6" cy="6" r="2" fill="white" opacity="0.5"/>
    <circle cx="18" cy="6" r="2" fill="white" opacity="0.5"/>
    <circle cx="6" cy="18" r="2" fill="white" opacity="0.3"/>
    <circle cx="18" cy="18" r="2" fill="white" opacity="0.3"/>
  </svg>`;

  const itemsHTML = items.map(item => `
    <tr>
      <td>${item.desc || '—'}</td>
      <td style="text-align:center;">${item.cant}</td>
      <td style="text-align:right;">$${(item.precio || 0).toLocaleString('es-AR')}</td>
      <td style="text-align:right;">$${((item.cant || 1) * (item.precio || 0)).toLocaleString('es-AR')}</td>
    </tr>
  `).join('');

  if (d.plantilla === 'clasica') {
    return `
      <div class="prev-clasica">
        <div class="prev-header-clasica">
          <div class="prev-logo">${logoSVG}<div class="prev-empresa"><strong>DOT Eventos</strong><span>Organización de Eventos</span></div></div>
          <div class="prev-num-fecha"><strong>${d.numero}</strong><span>${d.hoy}</span></div>
        </div>
        <div class="prev-divider"></div>
        <div class="prev-datos-row">
          <div class="prev-bloque">
            <div class="prev-bloque-titulo">Cliente</div>
            <p>${d.cliNombre || '—'}</p>
            ${d.cliTel ? `<p>${d.cliTel}</p>` : ''}
            ${d.cliEmail ? `<p>${d.cliEmail}</p>` : ''}
            ${d.cliDir ? `<p>${d.cliDir}</p>` : ''}
          </div>
          <div class="prev-bloque">
            <div class="prev-bloque-titulo">Evento</div>
            <p>${d.evTipo}</p>
            <p>${d.evFecha}</p>
            ${d.evLugar ? `<p>${d.evLugar}</p>` : ''}
          </div>
        </div>
        ${d.intro ? `<div class="prev-intro">${d.intro.replace(/\n/g,'<br>')}</div>` : ''}
        <table class="prev-tabla">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="prev-totales">
          <div class="prev-total-row"><span>Subtotal</span><span>$${d.subtotal.toLocaleString('es-AR')}</span></div>
          ${d.descPct > 0 ? `<div class="prev-total-row"><span>Descuento (${d.descPct}%)</span><span>-$${d.descMonto.toLocaleString('es-AR')}</span></div>` : ''}
          ${d.iva > 0 ? `<div class="prev-total-row"><span>IVA (21%)</span><span>$${d.iva.toLocaleString('es-AR')}</span></div>` : ''}
          <div class="prev-total-row prev-total-final"><span>TOTAL</span><span>$${d.total.toLocaleString('es-AR')}</span></div>
        </div>
        ${d.notas ? `<div class="prev-notas"><strong>Condiciones:</strong><br>${d.notas.replace(/\n/g,'<br>')}</div>` : ''}
        ${d.validez ? `<div class="prev-validez">Validez de esta oferta: ${d.validez}</div>` : ''}
      </div>`;
  }

  if (d.plantilla === 'moderna') {
    return `
      <div class="prev-moderna">
        <div class="prev-header-moderna">
          <div class="prev-header-moderna-left">
            ${logoSVG}
            <div><div class="prev-empresa-moderna">DOT Eventos</div><div class="prev-subtitulo-moderna">Organización de Eventos</div></div>
          </div>
          <div class="prev-header-moderna-right">
            <div class="prev-pres-tag">PRESUPUESTO</div>
            <div class="prev-num-moderna">${d.numero}</div>
            <div class="prev-fecha-moderna">${d.hoy}</div>
          </div>
        </div>
        <div class="prev-banda-moderna">
          <div>${d.cliNombre || 'Cliente'}</div>
          <div>${d.evTipo} · ${d.evFecha}</div>
        </div>
        ${d.intro ? `<div class="prev-intro-moderna">${d.intro.replace(/\n/g,'<br>')}</div>` : ''}
        <table class="prev-tabla prev-tabla-moderna">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="prev-totales-moderna">
          ${d.descPct > 0 ? `<div class="prev-total-row"><span>Descuento (${d.descPct}%)</span><span>-$${d.descMonto.toLocaleString('es-AR')}</span></div>` : ''}
          ${d.iva > 0 ? `<div class="prev-total-row"><span>IVA (21%)</span><span>$${d.iva.toLocaleString('es-AR')}</span></div>` : ''}
          <div class="prev-total-row prev-total-moderna"><span>TOTAL</span><span>$${d.total.toLocaleString('es-AR')}</span></div>
        </div>
        ${d.notas ? `<div class="prev-notas-moderna">${d.notas.replace(/\n/g,'<br>')}</div>` : ''}
        ${d.validez ? `<div class="prev-validez-moderna">Validez: ${d.validez}</div>` : ''}
      </div>`;
  }

  if (d.plantilla === 'elegante') {
    return `
      <div class="prev-elegante">
        <div class="prev-header-elegante">
          <div class="prev-logo-elegante">${logoSVG}<div><div class="prev-empresa-elegante">DOT EVENTOS</div><div class="prev-slogan-elegante">Organización de Eventos</div></div></div>
          <div class="prev-linea-elegante"></div>
          <div class="prev-num-elegante">Nro. ${d.numero} · ${d.hoy}</div>
        </div>
        <div class="prev-datos-elegante">
          <div><span class="prev-label-elegante">Para:</span> ${d.cliNombre || '—'}${d.cliTel ? ' · ' + d.cliTel : ''}${d.cliEmail ? ' · ' + d.cliEmail : ''}</div>
          <div><span class="prev-label-elegante">Evento:</span> ${d.evTipo} · ${d.evFecha}${d.evLugar ? ' · ' + d.evLugar : ''}</div>
        </div>
        ${d.intro ? `<div class="prev-intro-elegante">${d.intro.replace(/\n/g,'<br>')}</div>` : ''}
        <table class="prev-tabla prev-tabla-elegante">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="prev-totales-elegante">
          <div class="prev-total-row"><span>Subtotal</span><span>$${d.subtotal.toLocaleString('es-AR')}</span></div>
          ${d.descPct > 0 ? `<div class="prev-total-row"><span>Descuento (${d.descPct}%)</span><span>-$${d.descMonto.toLocaleString('es-AR')}</span></div>` : ''}
          ${d.iva > 0 ? `<div class="prev-total-row"><span>IVA (21%)</span><span>$${d.iva.toLocaleString('es-AR')}</span></div>` : ''}
          <div class="prev-total-row prev-total-elegante"><span>TOTAL</span><span>$${d.total.toLocaleString('es-AR')}</span></div>
        </div>
        ${d.notas ? `<div class="prev-notas-elegante">${d.notas.replace(/\n/g,'<br>')}</div>` : ''}
        ${d.validez ? `<div class="prev-firma-elegante">Validez de esta oferta: ${d.validez}<br><br><br>_______________________<br>DOT Eventos</div>` : ''}
      </div>`;
  }
}

async function guardarPresupuesto() {
  const payload = {
    evento_id: eventoActual.id,
    numero: document.getElementById('pres-numero').value,
    plantilla: plantillaActual,
    intro: document.getElementById('pres-intro').value,
    items: items,
    descuento: parseFloat(document.getElementById('pres-descuento').value) || 0,
    incluye_iva: document.getElementById('pres-iva').checked,
    notas_finales: document.getElementById('pres-notas').value,
    validez: document.getElementById('pres-validez').value,
    updated_at: new Date().toISOString()
  };

  const { data: existing } = await supabaseClient
    .from('presupuestos').select('id').eq('evento_id', eventoActual.id).single();

  if (existing) {
    await supabaseClient.from('presupuestos').update(payload).eq('id', existing.id);
  } else {
    await supabaseClient.from('presupuestos').insert(payload);
  }

  toast('Presupuesto guardado');
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const numero = document.getElementById('pres-numero').value;
  const validez = document.getElementById('pres-validez').value;
  const intro = document.getElementById('pres-intro').value;
  const notas = document.getElementById('pres-notas').value;
  const cliNombre = document.getElementById('cli-nombre').value;
  const cliTel = document.getElementById('cli-telefono').value;
  const cliEmail = document.getElementById('cli-email').value;
  const cliDir = document.getElementById('cli-direccion').value;
  const evTipo = document.getElementById('ev-tipo').value;
  const evFecha = document.getElementById('ev-fecha').value;
  const evLugar = document.getElementById('ev-lugar').value;
  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  const subtotal = items.reduce((a, item) => a + (item.cant || 1) * (item.precio || 0), 0);
  const descPct = parseFloat(document.getElementById('pres-descuento').value) || 0;
  const descMonto = subtotal * (descPct / 100);
  const subtotalConDesc = subtotal - descMonto;
  const incluyeIva = document.getElementById('pres-iva').checked;
  const iva = incluyeIva ? subtotalConDesc * 0.21 : 0;
  const total = subtotalConDesc + iva;

  const W = 210;
  let y = 0;
  const nl = (n = 6) => { y += n; if (y > 270) { doc.addPage(); y = 20; } };
  const texto = (t, x, size = 10, bold = false, color = [30, 30, 46]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(String(t), x, y);
  };

  if (plantillaActual === 'clasica') {
    // Header
    doc.setFillColor(127, 119, 221);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 14, 8, 'F');
    doc.setFillColor(127, 119, 221);
    doc.circle(20, 14, 4, 'F');
    doc.circle(14, 8, 2, 'F');
    doc.circle(26, 8, 2, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('DOT Eventos', 32, 12);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Organización de Eventos', 32, 19);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(numero, W - 20, 12, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(hoy, W - 20, 19, { align: 'right' });
    y = 38;

  } else if (plantillaActual === 'moderna') {
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, W, 35, 'F');
    doc.setFillColor(127, 119, 221);
    doc.rect(0, 35, W, 4, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 17, 8, 'F');
    doc.setFillColor(26, 26, 46);
    doc.circle(20, 17, 4, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('DOT Eventos', 32, 14);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 220);
    doc.text('Organización de Eventos', 32, 21);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(127, 119, 221);
    doc.text('PRESUPUESTO', W - 20, 14, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 220);
    doc.text(numero + ' · ' + hoy, W - 20, 22, { align: 'right' });
    doc.setFillColor(127, 119, 221);
    doc.rect(0, 42, W, 12, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(cliNombre || 'Cliente', 15, 50);
    doc.text(evTipo + ' · ' + evFecha, W - 15, 50, { align: 'right' });
    y = 62;

  } else if (plantillaActual === 'elegante') {
    doc.setDrawColor(127, 119, 221);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, W - 16, 281, 'S');
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 20, 8, 'F');
    doc.setFillColor(127, 119, 221);
    doc.circle(20, 20, 4, 'F');
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 46);
    doc.text('DOT EVENTOS', 32, 18);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 140);
    doc.text('Organización de Eventos', 32, 25);
    doc.setDrawColor(127, 119, 221);
    doc.setLineWidth(0.3);
    doc.line(15, 32, W - 15, 32);
    doc.setFontSize(9); doc.setTextColor(100, 100, 120);
    doc.text('Nro. ' + numero + ' · ' + hoy, W / 2, 38, { align: 'center' });
    y = 48;
  }

  // Datos cliente y evento
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 46);
  doc.text('Para:', 15, y); y += 6;
  doc.setFont('helvetica', 'normal');
  if (cliNombre) { doc.text(cliNombre, 15, y); nl(); }
  if (cliTel) { doc.text(cliTel, 15, y); nl(); }
  if (cliEmail) { doc.text(cliEmail, 15, y); nl(); }
  if (cliDir) { doc.text(cliDir, 15, y); nl(); }
  nl(2);
  doc.setFont('helvetica', 'bold');
  doc.text('Evento:', 15, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(evTipo + ' · ' + evFecha + (evLugar ? ' · ' + evLugar : ''), 15, y); nl(10);

  // Intro
  if (intro) {
    const introLines = doc.splitTextToSize(intro, W - 30);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 80);
    introLines.forEach(line => { doc.text(line, 15, y); nl(); });
    nl(4);
  }

  // Tabla de ítems
  doc.setFillColor(plantillaActual === 'moderna' ? 26 : plantillaActual === 'elegante' ? 240 : 127,
                   plantillaActual === 'moderna' ? 26 : plantillaActual === 'elegante' ? 240 : 119,
                   plantillaActual === 'moderna' ? 46 : plantillaActual === 'elegante' ? 245 : 221);
  doc.rect(15, y - 4, W - 30, 8, 'F');
  const headerColor = plantillaActual === 'elegante' ? [30, 30, 46] : [255, 255, 255];
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...headerColor);
  doc.text('Descripción', 17, y);
  doc.text('Cant.', 130, y, { align: 'center' });
  doc.text('P. Unit.', 160, y, { align: 'right' });
  doc.text('Subtotal', W - 17, y, { align: 'right' });
  nl(6);

  items.forEach((item, i) => {
    if (i % 2 === 0) { doc.setFillColor(249, 248, 255); doc.rect(15, y - 4, W - 30, 7, 'F'); }
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 46);
    const desc = doc.splitTextToSize(item.desc || '—', 100);
    doc.text(desc[0], 17, y);
    doc.text(String(item.cant || 1), 130, y, { align: 'center' });
    doc.text('$' + (item.precio || 0).toLocaleString('es-AR'), 160, y, { align: 'right' });
    doc.text('$' + ((item.cant || 1) * (item.precio || 0)).toLocaleString('es-AR'), W - 17, y, { align: 'right' });
    nl(7);
  });

  nl(4);
  doc.setDrawColor(200); doc.line(15, y, W - 15, y); nl(6);

  // Totales
  const totalesX = W - 80;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 100);
  doc.text('Subtotal:', totalesX, y); doc.text('$' + subtotal.toLocaleString('es-AR'), W - 17, y, { align: 'right' }); nl();
  if (descPct > 0) {
    doc.text('Descuento (' + descPct + '%):', totalesX, y);
    doc.text('-$' + descMonto.toLocaleString('es-AR'), W - 17, y, { align: 'right' }); nl();
  }
  if (incluyeIva) {
    doc.text('IVA (21%):', totalesX, y);
    doc.text('$' + iva.toLocaleString('es-AR'), W - 17, y, { align: 'right' }); nl();
  }
  nl(2);
  doc.setFillColor(127, 119, 221);
  doc.rect(totalesX - 5, y - 5, W - totalesX - 10, 9, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', totalesX, y);
  doc.text('$' + total.toLocaleString('es-AR'), W - 17, y, { align: 'right' });
  nl(12);

  // Notas
  if (notas) {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 46);
    doc.text('Condiciones:', 15, y); nl(5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 100);
    const notasLines = doc.splitTextToSize(notas, W - 30);
    notasLines.forEach(line => { doc.text(line, 15, y); nl(5); });
    nl(4);
  }

  if (validez) {
    doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 140);
    doc.text('Validez de esta oferta: ' + validez, 15, y); nl(10);
  }

  if (plantillaActual === 'elegante') {
    nl(6);
    doc.setDrawColor(127, 119, 221); doc.line(15, y, 70, y); nl(5);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 100);
    doc.text('DOT Eventos', 15, y);
  }

  const nombreArchivo = (eventoActual?.nombre || 'presupuesto').replace(/ /g, '-') + '-' + numero + '.pdf';
  doc.save(nombreArchivo);
  toast('PDF exportado');
}