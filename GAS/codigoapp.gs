/**
 * Registro de entregas (Apps Script)
 *  - Guarda la entrega en la hoja "Entregas".
 *  - Envía una copia a Odoo (CRM) con etapa, etiqueta, equipo y monto.
 * Instalación: Extensiones > Apps Script desde tu Google Sheet.
 * La API Key de Odoo NO va en el código: Configuración del proyecto >
 * Propiedades del script > ODOO_API_KEY.
 */

// ---------- Configuración general ----------
const HOJA_DATOS = 'Entregas';
const HOJA_LISTAS = 'Listas';
const HOJA_PENDIENTES = 'Pendientes_Odoo';
const ZONA_HORARIA = 'America/Managua';
const DIAS_ATRAS_MAX = 30;

// ---------- Configuración de Odoo (los nombres deben ser idénticos a los de Odoo) ----------
const ODOO_URL = 'https://mambo.odoo.com/jsonrpc';
const ODOO_DB = 'mambo';
const ODOO_USER_ID = 2;
const ODOO_EQUIPO = 'Logistica';
const ODOO_ETIQUETA = 'Logistica';
const ODOO_ETAPA_ENTREGADA = 'Entregado';
const ODOO_ETAPA_RECHAZADA = 'Rechazado';

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Registro de entregas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// =====================================================================
// LISTAS (catálogos del formulario)
// =====================================================================

/** Ejecutar UNA vez: crea la hoja Listas con todas las opciones válidas. */
function crearListas() {
  const zonas = ['Managua - Distrito I', 'Managua - Distrito II', 'Managua - Distrito III',
    'Managua - Distrito IV', 'Managua - Distrito V', 'Managua - Distrito VI',
    'Managua - Distrito VII', 'Ciudad Sandino', 'Tipitapa', 'Mateare', 'Ticuantepe',
    'Villa El Carmen', 'San Rafael del Sur', 'El Crucero', 'San Francisco Libre'];
  const tipos = ['Pulpería', 'Supermercado', 'Mini Súper', 'Distribuidor', 'Comisariato', 'Tienda de Barrio'];
  const cats = [['Bebidas', 850], ['Lácteos', 1200], ['Snacks', 600], ['Aseo del Hogar', 1500],
    ['Cuidado Personal', 1800], ['Granos Básicos', 1000], ['Aceites y Salsas', 1100]];
  const rutas = [['Ruta A', 'Carlos Mejía'], ['Ruta B', 'Luis Herrera'], ['Ruta C', 'Marvin Solís'],
    ['Ruta D', 'Karla Ruiz'], ['Ruta E', 'Josué Pérez']];
  const motivos = ['Cliente ausente / local cerrado', 'Producto dañado en transporte', 'Pedido incorrecto',
    'Cliente sin efectivo / crédito', 'Dirección no encontrada', 'Entrega fuera de horario',
    'Producto vencido / próximo a vencer'];
  const n = Math.max(zonas.length, tipos.length, cats.length, rutas.length, motivos.length);
  const data = [['Zona', 'Tipo_Cliente', 'Categoria', 'Precio_Caja_CS', 'Ruta', 'Repartidor', 'Motivo_Rechazo']];
  for (let i = 0; i < n; i++) {
    data.push([zonas[i] || '', tipos[i] || '',
      cats[i] ? cats[i][0] : '', cats[i] ? cats[i][1] : '',
      rutas[i] ? rutas[i][0] : '', rutas[i] ? rutas[i][1] : '', motivos[i] || '']);
  }
  const ws = ss_().getSheetByName(HOJA_LISTAS) || ss_().insertSheet(HOJA_LISTAS);
  ws.clear();
  ws.getRange(1, 1, data.length, 7).setValues(data);
  ws.getRange(1, 1, 1, 7).setFontWeight('bold');
  ws.autoResizeColumns(1, 7);
}

/** Lee las listas válidas y las fechas permitidas (hora de Managua). */
function getListas() {
  const ws = ss_().getSheetByName(HOJA_LISTAS);
  if (!ws) throw new Error('Falta la hoja Listas. Ejecuta crearListas() primero.');
  const v = ws.getDataRange().getValues().slice(1);
  const col = i => v.map(r => r[i]).filter(x => x !== '');
  const fmt = ms => Utilities.formatDate(new Date(ms), ZONA_HORARIA, 'yyyy-MM-dd');
  return {
    zonas: col(0),
    tipos: col(1),
    categorias: v.filter(r => r[2] !== '').map(r => ({ nombre: r[2], precio: Number(r[3]) })),
    rutas: v.filter(r => r[4] !== '').map(r => ({ ruta: r[4], repartidor: r[5] })),
    motivos: col(6),
    hoy: fmt(Date.now()),
    min: fmt(Date.now() - DIAS_ATRAS_MAX * 86400000)
  };
}

// =====================================================================
// GUARDAR ENTREGA
// =====================================================================

/**
 * 1) Valida todo en el servidor.  2) Guarda la fila en Entregas (con candado).
 * 3) Fuera del candado, envía a Odoo; si Odoo falla, la entrega YA está guardada
 *    y el fallo queda anotado en la hoja Pendientes_Odoo para reintentar.
 */
function guardarEntrega(d) {
  let resultado;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const L = getListas();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || d.fecha < L.min || d.fecha > L.hoy)
      throw new Error('Fecha no válida (máximo ' + DIAS_ATRAS_MAX + ' días atrás y no futura).');
    if (L.zonas.indexOf(d.zona) < 0) throw new Error('Zona no válida.');
    if (L.tipos.indexOf(d.tipo) < 0) throw new Error('Tipo de cliente no válido.');
    const cat = L.categorias.find(c => c.nombre === d.categoria);
    if (!cat) throw new Error('Categoría no válida.');
    const rut = L.rutas.find(r => r.ruta === d.ruta);
    if (!rut) throw new Error('Ruta no válida.');
    const cajas = parseInt(d.cajas, 10);
    if (!(cajas >= 1 && cajas <= 500)) throw new Error('Cajas debe estar entre 1 y 500.');
    const tmin = parseInt(d.tiempo, 10);
    if (!(tmin >= 1 && tmin <= 300)) throw new Error('Tiempo debe estar entre 1 y 300 minutos.');
    if (d.estado !== 'Entregada' && d.estado !== 'Rechazada') throw new Error('Estado no válido.');
    let motivo = '';
    if (d.estado === 'Rechazada') {
      if (L.motivos.indexOf(d.motivo) < 0) throw new Error('Debes elegir un motivo de rechazo.');
      motivo = d.motivo;
    }

    const ws = ss_().getSheetByName(HOJA_DATOS);
    const ultima = ws.getLastRow();
    const n = parseInt(String(ws.getRange(ultima, 1).getValue()).replace('ENT-', ''), 10);
    if (isNaN(n)) throw new Error('No pude leer el último ID de la hoja Entregas.');
    const id = 'ENT-' + String(n + 1).padStart(5, '0');
    const valor = Math.round(cajas * cat.precio * 100) / 100;

    const nueva = ws.getRange(ultima + 1, 1, 1, 12);
    ws.getRange(ultima, 1, 1, 12).copyTo(nueva, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    nueva.setValues([[id, d.fecha, d.zona, d.tipo, d.categoria, cajas, valor,
      d.ruta, rut.repartidor, tmin, d.estado, motivo]]);
    SpreadsheetApp.flush();
    resultado = { ok: true, id: id, valor: valor };
  } finally {
    lock.releaseLock();
  }

  // Odoo fuera del candado: no frena a otros usuarios ni rompe el guardado
  try {
    enviarAOdoo(d, resultado.valor, resultado.id, false);
    resultado.odoo = 'ok';
  } catch (e) {
    resultado.odoo = 'error';
    registrarFalloOdoo_(resultado.id, e.message, d, resultado.valor);
  }
  return resultado;
}

// =====================================================================
// ODOO
// =====================================================================

/** Llamada genérica a Odoo (execute_kw). La clave se lee de las propiedades del script. */
function odoo_(modelo, metodo, args) {
  const clave = PropertiesService.getScriptProperties().getProperty('ODOO_API_KEY');
  if (!clave) throw new Error('Falta ODOO_API_KEY en las propiedades del script.');
  const resp = UrlFetchApp.fetch(ODOO_URL, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Date.now(),
      params: {
        service: 'object', method: 'execute_kw',
        args: [ODOO_DB, ODOO_USER_ID, clave, modelo, metodo, args, {}]
      }
    })
  });
  const json = JSON.parse(resp.getContentText());
  if (json.error) throw new Error('Odoo: ' + (json.error.data ? json.error.data.message : json.error.message));
  return json.result;
}

/** Busca el ID de una etapa, etiqueta o equipo por su nombre (cache de 6 horas). */
function idPorNombre_(modelo, nombre) {
  const cache = CacheService.getScriptCache();
  const clave = 'odoo_' + modelo + '_' + nombre;
  const guardado = cache.get(clave);
  if (guardado) return parseInt(guardado, 10);
  const r = odoo_(modelo, 'search', [[['name', '=', nombre]]]);
  if (!r.length) throw new Error('No existe en Odoo: ' + modelo + ' "' + nombre + '"');
  cache.put(clave, String(r[0]), 21600);
  return r[0];
}

/** Crea el lead de la entrega en Odoo con etapa, equipo, etiqueta y monto. */
function enviarAOdoo(datos, valor, id, verificarDuplicado) {
  if (verificarDuplicado && odoo_('crm.lead', 'search_count', [[['name', 'ilike', id]]]) > 0) return;
  const etapa = idPorNombre_('crm.stage',
    datos.estado === 'Entregada' ? ODOO_ETAPA_ENTREGADA : ODOO_ETAPA_RECHAZADA);
  const etiqueta = idPorNombre_('crm.tag', ODOO_ETIQUETA);
  const equipo = idPorNombre_('crm.team', ODOO_EQUIPO);
  odoo_('crm.lead', 'create', [{
    name: id + ' | Entrega ' + datos.ruta + ' - ' + datos.fecha,
    contact_name: datos.tipo + ' (' + datos.zona + ')',
    stage_id: etapa,
    team_id: equipo,
    tag_ids: [[6, 0, [etiqueta]]],
    expected_revenue: valor,
    description: 'Cajas: ' + datos.cajas + ' | Valor: C$' + valor +
      ' | Estado: ' + datos.estado + ' | Tiempo: ' + datos.tiempo + ' min' +
      (datos.motivo ? ' | Motivo: ' + datos.motivo : '')
  }]);
}

/** Anota en la hoja Pendientes_Odoo una entrega que no se pudo enviar. */
function registrarFalloOdoo_(id, msg, datos, valor) {
  try {
    let ws = ss_().getSheetByName(HOJA_PENDIENTES);
    if (!ws) {
      ws = ss_().insertSheet(HOJA_PENDIENTES);
      ws.appendRow(['Fecha_Registro', 'ID_Entrega', 'Error', 'Datos_JSON', 'Estado']);
      ws.getRange(1, 1, 1, 5).setFontWeight('bold');
    }
    ws.appendRow([new Date(), id, msg, JSON.stringify({ datos: datos, valor: valor }), 'Pendiente']);
  } catch (e) {
    Logger.log('No pude anotar el pendiente ' + id + ': ' + e.message);
  }
}

// =====================================================================
// FUNCIONES PARA EJECUTAR A MANO DESDE EL EDITOR
// =====================================================================

/** Ejecutar una vez para dar el permiso de conexión externa. */
function autorizarPermisos() {
  UrlFetchApp.fetch('https://www.google.com');
  Logger.log('Permisos autorizados correctamente.');
}

/** Prueba la conexión y que existan el equipo, la etiqueta y las etapas. */
function probarOdoo() {
  Logger.log('Equipo "' + ODOO_EQUIPO + '": ' + idPorNombre_('crm.team', ODOO_EQUIPO));
  Logger.log('Etiqueta "' + ODOO_ETIQUETA + '": ' + idPorNombre_('crm.tag', ODOO_ETIQUETA));
  Logger.log('Etapa "' + ODOO_ETAPA_ENTREGADA + '": ' + idPorNombre_('crm.stage', ODOO_ETAPA_ENTREGADA));
  Logger.log('Etapa "' + ODOO_ETAPA_RECHAZADA + '": ' + idPorNombre_('crm.stage', ODOO_ETAPA_RECHAZADA));
  Logger.log('Conexión con Odoo correcta.');
}

/** Reenvía a Odoo las entregas marcadas como Pendiente (no duplica si ya existen). */
function reintentarPendientes() {
  const ws = ss_().getSheetByName(HOJA_PENDIENTES);
  if (!ws || ws.getLastRow() < 2) { Logger.log('No hay pendientes.'); return; }
  const filas = ws.getRange(2, 1, ws.getLastRow() - 1, 5).getValues();
  let enviados = 0, fallos = 0;
  filas.forEach(function (f, i) {
    if (f[4] !== 'Pendiente') return;
    const fila = i + 2;
    try {
      const p = JSON.parse(f[3]);
      enviarAOdoo(p.datos, p.valor, f[1], true);
      ws.getRange(fila, 3).setValue('');
      ws.getRange(fila, 5).setValue('Enviado');
      enviados++;
    } catch (e) {
      ws.getRange(fila, 3).setValue(e.message);
      fallos++;
    }
  });
  Logger.log('Reintentos: ' + enviados + ' enviados, ' + fallos + ' con error.');
}
