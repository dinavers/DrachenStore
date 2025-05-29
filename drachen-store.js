/* ===== Firebase Setup ===== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, setDoc, doc, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD8gt7w3TqjWaQnjb5RA1GUXvMCaz_aWtE",
  authDomain: "drachen-store.firebaseapp.com",
  projectId: "drachen-store",
  storageBucket: "drachen-store.appspot.com",
  messagingSenderId: "640216157217",
  appId: "1:640216157217:web:b8f3737160fdd94cc9e760"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ===== Funciones Firebase ===== */
async function getDatos(coleccion) {
  const snapshot = await getDocs(collection(db, coleccion));
  return snapshot.docs.map(doc => doc.data());
}

async function agregarDato(coleccion, objeto) {
  await addDoc(collection(db, coleccion), objeto);
}

async function agregarMultiples(coleccion, objetos) {
  const ops = objetos.map(obj => addDoc(collection(db, coleccion), obj));
  await Promise.all(ops);
}

// =====================
// DRACHEN STORE - JS
// =====================

// ===== Validación general =====
const vendedorasPorSucursal = {
  oeste: ['Génesis', 'Yuli', 'Gaby', 'Michell', 'María',  'Irrenunciable'],
  puente: ['Génesis', 'Yuli', 'Gaby', 'Michell', 'María', 'Irrenunciable'],
  sur: ['Génesis', 'Yuli', 'Gaby', 'Michell', 'María', 'Irrenunciable']
};

function cargarVendedoras() {
  const selectOeste = document.getElementById('plazaOeste-select');
  const selectPuente = document.getElementById('puenteAlto-select');
  const selectSur = document.getElementById('plazaSur-select');

  vendedorasPorSucursal.oeste.forEach(nombre => {
    selectOeste.innerHTML += `<option value="${nombre}">${nombre}</option>`;
  });

  vendedorasPorSucursal.puente.forEach(nombre => {
    selectPuente.innerHTML += `<option value="${nombre}">${nombre}</option>`;
  });

  vendedorasPorSucursal.sur.forEach(nombre => {
    selectSur.innerHTML += `<option value="${nombre}">${nombre}</option>`;
  });
}

function validarFecha(fecha) {
  return fecha && !isNaN(new Date(fecha).getTime());
}

function formatearFecha(fechaStr) {
  const [year, month, day] = fechaStr.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}-${mes}-${anio}`;
}

function existeRegistro(data, fecha) {
  return data.some(d => d.fecha === fecha);
}

function ordenarPorFechaDesc(data) {
  return data.sort((a, b) => {
  const [ay, am, ad] = a.fecha.split('-').map(Number);
  const [by, bm, bd] = b.fecha.split('-').map(Number);
  const fa = new Date(ay, am - 1, ad);
  const fb = new Date(by, bm - 1, bd);
  return fb - fa;
});
}

// ===== Ventas =====
document.getElementById('sales-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fecha = document.getElementById('sale-date').value;
  const oeste = parseFloat(document.getElementById('sale-oeste').value);
  const puente = parseFloat(document.getElementById('sale-puente').value);
  const sur = parseFloat(document.getElementById('sale-sur').value);

  let ventas = await getDatos('ventas');

  // Validaciones
    if (!validarFecha(fecha)) return alert('Fecha inválida en ventas.');
    if (oeste < 0 || puente < 0 || sur < 0) return alert('Monto negativo en ventas.');
    if (existeRegistro(ventas, fecha)) return alert('Ya existe una venta registrada para esta fecha.');

  ventas.push({ fecha, oeste, puente, sur });
  await agregarDato('ventas', { fecha, oeste, puente, sur });

  this.reset();
  cargarVentas();
  actualizarDashboard();
  actualizarGraficoMovimientos();
});

// ===== Gastos =====
document.getElementById('expenses-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fecha = document.getElementById('expense-date').value;
  const descripcion = document.getElementById('expense-desc').value;
  const monto = parseFloat(document.getElementById('expense-amount').value);

  let gastos = await getDatos('gastos');

  // Validaciones
    if (!validarFecha(fecha)) return alert('Fecha inválida en gastos.');
    if (descripcion === '') return alert('Descripción de gasto vacía.');
    if (monto <= 0) return alert('Monto inválido en gastos.');

  gastos.push({ fecha, descripcion, monto });
  await agregarDato('gastos', { fecha, descripcion, monto });

  this.reset();
  cargarGastos();
  actualizarDashboard();
  actualizarGraficoMovimientos();
});

// ===== Horarios =====
document.getElementById('schedule-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fecha = document.getElementById('shift-date').value;
  const oeste = document.getElementById('plazaOeste-select').value;
  const puente = document.getElementById('puenteAlto-select').value;
  const sur = document.getElementById('plazaSur-select').value;

  let horarios = await getDatos('horarios');

  // Validaciones
  if (!validarFecha(fecha)) return alert('Fecha inválida en horarios.');
  if (oeste === '' || puente === '' || sur === '') return alert('Nombre vacío en horarios.');
  if (existeRegistro(horarios, fecha)) return alert('Ya existe un horario registrado para esta fecha.');

  horarios.push({ fecha, oeste, puente, sur });
  await agregarDato('horarios', { fecha, oeste, puente, sur });

  this.reset();
  cargarHorarios();
});

// ===== Mostrar datos =====
function filtrarUltimosDias(data, dias) {
  if (dias === 0) return data;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  return data.filter(d => {
  const [y, m, d2] = d.fecha.split('-').map(Number);
  const fecha = new Date(y, m - 1, d2); // evitar desfase de zona horaria
  return fecha >= fechaLimite;
});
}

async function cargarVentas() {
  const ventas = await getDatos('ventas');
//  const ventasFiltradas = filtrarUltimosDias(ventas, 7);
  const ventasFiltradas = ordenarPorFechaDesc(filtrarUltimosDias(ventas, 7));
  const tbody = document.getElementById('sales-table-body');
  tbody.innerHTML = '';
  ventasFiltradas.forEach(v => {
  tbody.innerHTML += `<tr>
    <td>${formatearFecha(v.fecha)}</td>
    <td>$${v.oeste.toLocaleString('es-CL')}</td>
    <td>$${v.puente.toLocaleString('es-CL')}</td>
    <td>$${v.sur.toLocaleString('es-CL')}</td>
  </tr>`;
});
}

async function cargarGastos() {
  const gastos = await getDatos('gastos');
  const gastosFiltrados = filtrarUltimosDias(gastos, 7);
  const tbody = document.getElementById('expenses-table-body');
  tbody.innerHTML = '';
  gastosFiltrados.forEach(g => {
  tbody.innerHTML += `<tr>
    <td>${formatearFecha(g.fecha)}</td>
    <td>${g.descripcion}</td>
    <td>$${g.monto.toLocaleString('es-CL')}</td>
  </tr>`;
});
}

async function cargarHorarios() {
  const horarios = await getDatos('horarios');
  const horariosFiltrados = filtrarUltimosDias(horarios, 7);
  const tbody = document.getElementById('schedule-table-body');
  tbody.innerHTML = '';
  horariosFiltrados.forEach(h => {
    const diaSemana = new Date(h.fecha).toLocaleDateString('es-ES', { weekday: 'long' });
    tbody.innerHTML += `<tr>
      <td>${formatearFecha(h.fecha)}</td>
      <td>${diaSemana}</td>
      <td>${h.oeste}</td>
      <td>${h.puente}</td>
      <td>${h.sur}</td>
    </tr>`;
  });
}

async function sobrescribirDatos(coleccion, registros, claveUnica) {
  const ops = registros.map(reg => {
    const docId = reg[claveUnica];
    return setDoc(doc(db, coleccion, docId), reg);
  });
  await Promise.all(ops);
}

// ===== Dashboard =====
async function actualizarDashboard() {
  const ventas = await getDatos('ventas');
  const gastos = await getDatos('gastos');
  const mesActual = new Date().getMonth();

  const totalVentas = ventas
    .filter(v => new Date(v.fecha).getMonth() === mesActual)
    .reduce((sum, v) => sum + v.oeste + v.puente + v.sur, 0);

  const totalGastos = gastos
    .filter(g => new Date(g.fecha).getMonth() === mesActual)
    .reduce((sum, g) => sum + g.monto, 0);

    document.getElementById('total-sales').textContent = `$${totalVentas.toLocaleString('es-CL')}`;
  document.getElementById('total-expenses').textContent = `$${totalGastos.toLocaleString('es-CL')}`;
  document.getElementById('net-profit').textContent = `$${(totalVentas - totalGastos).toLocaleString('es-CL')}`;
}

// ===== Filtros =====
document.getElementById('apply-filter-sales').addEventListener('click', async function () {
  const desdeStr = document.getElementById('filter-date-from-sales').value;
  const hastaStr = document.getElementById('filter-date-to-sales').value;
  const ventas = await getDatos('ventas');
  const tbody = document.getElementById('sales-table-body');
  tbody.innerHTML = '';

  const desde = desdeStr ? new Date(...desdeStr.split('-').map((v, i) => i === 1 ? +v - 1 : +v)) : null;
  const hasta = hastaStr ? new Date(...hastaStr.split('-').map((v, i) => i === 1 ? +v - 1 : +v)) : null;

  const filtradas = ventas.filter(v => {
    const [y, m, d] = v.fecha.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  });

  ordenarPorFechaDesc(filtradas).forEach(v => {
    tbody.innerHTML += `<tr>
      <td>${formatearFecha(v.fecha)}</td>
      <td>$${v.oeste.toLocaleString('es-CL')}</td>
      <td>$${v.puente.toLocaleString('es-CL')}</td>
      <td>$${v.sur.toLocaleString('es-CL')}</td>
    </tr>`;
  });
});

  document.getElementById('reset-filter-sales').addEventListener('click', async function () {
  document.getElementById('filter-date-from-sales').value = '';
  document.getElementById('filter-date-to-sales').value = '';

  await cargarVentas(); // vuelve a cargar los últimos 7 días
});

document.getElementById('apply-filter-schedule').addEventListener('click', async function () {
  const desdeStr = document.getElementById('filter-date-from-schedule').value;
  const hastaStr = document.getElementById('filter-date-to-schedule').value;
  const horarios = await getDatos('horarios');
  const tbody = document.getElementById('schedule-table-body');
  tbody.innerHTML = '';

  const desde = desdeStr ? new Date(...desdeStr.split('-').map((v, i) => i === 1 ? +v - 1 : +v)) : null;
  const hasta = hastaStr ? new Date(...hastaStr.split('-').map((v, i) => i === 1 ? +v - 1 : +v)) : null;

  const filtrados = horarios.filter(h => {
    const [y, m, d] = h.fecha.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  });

  ordenarPorFechaDesc(filtrados).forEach(h => {
    const diaSemana = new Date(h.fecha).toLocaleDateString('es-ES', { weekday: 'long' });
    tbody.innerHTML += `<tr>
      <td>${formatearFecha(h.fecha)}</td>
      <td>${diaSemana}</td>
      <td>${h.oeste}</td>
      <td>${h.puente}</td>
      <td>${h.sur}</td>
    </tr>`;
  });
});

document.getElementById('reset-filter-schedule').addEventListener('click', async function () {
  document.getElementById('filter-date-from-schedule').value = '';
  document.getElementById('filter-date-to-schedule').value = '';
  await cargarHorarios(); // vuelve a mostrar los últimos 7 días
});

document.getElementById('apply-filter-expenses').addEventListener('click', async function () {
  const desdeStr = document.getElementById('filter-date-from').value;
  const hastaStr = document.getElementById('filter-date-to').value;
  const texto = document.getElementById('filter-text-expenses').value.trim().toLowerCase();
  const tbody = document.getElementById('expenses-table-body');
  tbody.innerHTML = '';

  const gastos = await getDatos('gastos');

  let filtrados = gastos.filter(g => {
    const fechaGasto = new Date(g.fecha);
    const desde = desdeStr ? new Date(desdeStr) : null;
    const hasta = hastaStr ? new Date(hastaStr) : null;

    const enRango = (!desde || fechaGasto >= desde) && (!hasta || fechaGasto <= hasta);
    const coincideTexto = texto === '' || g.descripcion.toLowerCase().includes(texto);

    return enRango && coincideTexto;
  });

  ordenarPorFechaDesc(filtrados).forEach(g => {
    tbody.innerHTML += `<tr>
      <td>${formatearFecha(g.fecha)}</td>
      <td>${g.descripcion}</td>
      <td>$${g.monto.toLocaleString('es-CL')}</td>
    </tr>`;
  });
});

document.getElementById('apply-filter-summary').addEventListener('click', () => {
  const desdeStr = document.getElementById('filter-date-from-summary').value;
  const hastaStr = document.getElementById('filter-date-to-summary').value;
  actualizarGraficoMovimientos(desdeStr, hastaStr);
});

document.getElementById('reset-filter-summary').addEventListener('click', () => {
  document.getElementById('filter-date-from-summary').value = '';
  document.getElementById('filter-date-to-summary').value = '';
  actualizarGraficoMovimientos(); // últimos 30 días
});

document.getElementById('btn-import').addEventListener('click', async function() {
  await importarCSV('import-sales', 'ventas', mapearVenta, cargarVentas);
  await importarCSV('import-expenses', 'gastos', mapearGasto, cargarGastos);
  await importarCSV('import-schedule', 'horarios', mapearHorario, cargarHorarios);
  actualizarDashboard();
  actualizarGraficoMovimientos();
  alert('Importación completada!');
});

// Función genérica para importar CSV
async function importarCSV(inputId, storageKey, mapFunc, refreshFunc) {
  const input = document.getElementById(inputId);
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const lines = text.trim().split('\n');
    const registros = lines.slice(1).map(line => mapFunc(line.split(',')));

    await sobrescribirDatos(storageKey, registros, 'fecha');
    refreshFunc();

  };
  reader.readAsText(file, 'UTF-8');
}

// Mapeadores específicos por entidad
function mapearVenta(cols) {
  return {
    fecha: cols[0],
    oeste: parseFloat(cols[1]),
    puente: parseFloat(cols[2]),
    sur: parseFloat(cols[3])
  };
}

function mapearGasto(cols) {
  return {
    fecha: cols[0],
    descripcion: cols[1],
    monto: parseFloat(cols[2])
  };
}

function mapearHorario(cols) {
  return {
    fecha: cols[0],
    oeste: cols[1],
    puente: cols[2],
    sur: cols[3]
  };
}

// ===== Inicialización =====
window.onload = function() {
  cargarVentas();
  cargarGastos();
  cargarHorarios();
  cargarVendedoras();
  actualizarDashboard();
  actualizarGraficoMovimientos();

  // Botón: Limpiar filtros
  document.getElementById('reset-filter-expenses').addEventListener('click', async function () {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-text-expenses').value = '';

    const gastos = await getDatos('gastos');
    const ultimos7 = ordenarPorFechaDesc(gastos).slice(0, 7);
    const tbody = document.getElementById('expenses-table-body');
    tbody.innerHTML = '';
    ultimos7.forEach(g => {
      tbody.innerHTML += `<tr>
        <td>${formatearFecha(g.fecha)}</td>
        <td>${g.descripcion}</td>
        <td>$${g.monto.toLocaleString('es-CL')}</td>
      </tr>`;
    });
  });
};

let modoMensual = false;
const ctx = document.getElementById('movimientos-chart').getContext('2d');
let chart;

document.getElementById('toggle-period').addEventListener('click', async () => {
  modoMensual = !modoMensual;
  document.getElementById('toggle-period').textContent = modoMensual ? 'Ver Semanal' : 'Ver Mensual';
  actualizarGraficoMovimientos();
});

async function actualizarGraficoMovimientos() {
  const ventas = await getDatos('ventas');
  const gastos = await getDatos('gastos');

  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() - (modoMensual ? 30 : 7));

  const ventasFiltradas = ventas.filter(v => new Date(v.fecha) >= limite);
  const gastosFiltradas = gastos.filter(g => new Date(g.fecha) >= limite);

  let totalOeste = 0, totalPuente = 0, totalSur = 0;
  ventasFiltradas.forEach(v => {
    totalOeste += v.oeste;
    totalPuente += v.puente;
    totalSur += v.sur;
  });

  const totalVentas = totalOeste + totalPuente + totalSur;
  const totalGastos = gastosFiltradas.reduce((sum, g) => sum + g.monto, 0);
  const ganancia = totalVentas - totalGastos;

  const datos = {
    labels: ['Plaza Oeste', 'Puente Alto', 'Gran Avenida', 'Gastos', 'Ganancias'],
    datasets: [{
      label: modoMensual ? 'Últimos 30 días' : 'Últimos 7 días',
      data: [totalOeste, totalPuente, totalSur, totalGastos, ganancia],
      backgroundColor: ['#4caf50', '#66bb6a', '#81c784', '#f44336', '#2196f3'],
      borderRadius: 5
    }]
  };

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: datos,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
  callbacks: {
    label: (ctx) => {
      const valor = ctx.raw.toLocaleString('es-CL');
      return `$${valor}`;
    }
  }
}
      },
      scales: {
        y: {
          ticks: {
            color: '#fff',
            callback: (val) => `$${val.toLocaleString('es-CL')}`
          },
          beginAtZero: true
        },
        x: {
          ticks: { color: '#fff' }
        }
      }
    }
  });

  const desde = limite.toLocaleDateString('es-CL');
  const hasta = hoy.toLocaleDateString('es-CL');
  document.getElementById('rango-fechas').textContent = `Mostrando datos del ${desde} al ${hasta}`;

}

function calcularComision(monto) {
  if (monto < 100000) return 0;
  let tramos = Math.floor((monto - 100000) / 50000);
  return 3000 + tramos * 5000;
}

document.getElementById('btn-generar-comisiones').addEventListener('click', async () => {
  const ventas = await getDatos('ventas');
  const horarios = await getDatos('horarios');
  let gastos = await getDatos('gastos');

  const pagosGenerados = [];

  horarios.forEach(h => {
    const venta = ventas.find(v => v.fecha === h.fecha);
    if (!venta) return;

    const pagosDia = [
      { nombre: h.oeste, montoVentas: venta.oeste },
      { nombre: h.puente, montoVentas: venta.puente },
      { nombre: h.sur, montoVentas: venta.sur }
    ];

    pagosDia.forEach(p => {
      if (!p.nombre || p.nombre.trim() === '') return;

      const nombreNormalizado = p.nombre.trim().toLowerCase();
      const esGenesis = nombreNormalizado === 'génesis';

      // Evitar duplicados
      const yaExiste = gastos.some(g => g.fecha === h.fecha && g.descripcion.includes(p.nombre));
      if (yaExiste) return;

      let base = esGenesis ? 40000 : 22000;
      let comision = esGenesis ? 0 : calcularComision(p.montoVentas);
      let total = base + comision;

      let descripcion = `pago de ${p.nombre}`;
      if (comision > 0) {
        descripcion += ` (comisión $${comision.toLocaleString('es-CL')})`;
      }

      pagosGenerados.push({
        fecha: h.fecha,
        descripcion,
        monto: total
      });
    });
  });

  if (pagosGenerados.length === 0) {
    alert('No hay nuevos pagos por generar.');
    return;
  }

  await agregarMultiples('gastos', pagosGenerados);
  await agregarDato('gastos', { fecha, descripcion, monto });
  cargarGastos();
  actualizarDashboard();
  actualizarGraficoMovimientos();
  alert('Pagos generados correctamente.');
});
