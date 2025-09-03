// LISTAR TODAS LAS PARADAS
// Backend: GET /paradas  -> [{ id, nombre, latitud, longitud }, ...]
export async function getStops({ signal } = {}) {
  const res = await fetch('/api/paradas', { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(p => ({
    id: p.id,
    nombre: p.nombre ?? '',
    lat: p.latitud ?? null,
    lng: p.longitud ?? null,
  }));
}

// --- RUTAS ---
// src/services/api.js
export async function getRoutes({ signal } = {}) {
  const res = await fetch('/api/rutas', { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();

  // Soporta { id, linea, origen, destino, operador } o { id, nombre, ... }
  return (Array.isArray(data) ? data : []).map(r => {
    const linea = (r.linea ?? r.nombre ?? '').toString(); //  SIEMPRE poblado
    return {
      id: r.id,
      linea,                             // ← usamos este en toda la app
      origen: r.origen ?? '',
      destino: r.destino ?? '',
      operador: r.operador ?? '',
    };
  });
}



// Paradas ordenadas de una ruta (para dibujar el recorrido)
export async function getRouteStops(rutaId, { signal } = {}) {
  const res = await fetch(`/api/rutas/${encodeURIComponent(rutaId)}/paradas`, { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  // Formato: [{ id, nombre, latitud, longitud, orden }]
  return (Array.isArray(data) ? data : [])
    .map(x => ({
      orden: Number(x.orden) || 0,
      paradaId: x.id,
      nombre: x.nombre ?? '',
      lat: Number(x.latitud),
      lng: Number(x.longitud),
    }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .sort((a, b) => a.orden - b.orden);
}

// --- INCIDENCIAS ---

// Utilidad para ordenar por severidad conocida
const _sevOrder = (s) => {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('alta')) return 3;
  if (v.startsWith('media')) return 2;
  if (v.startsWith('baja')) return 1;
  return 0;
};

// Normaliza una incidencia a un formato consistente en el front
function _normalizeInc(i) {
  const hasta = i.vigente_hasta ?? i.until ?? i.fin ?? null;
  const ts = hasta ? Date.parse(hasta) : NaN;
  return {
    id: i.id ?? null,
    ruta_id: i.ruta_id ?? i.rutaId ?? null,
    parada_id: i.parada_id ?? i.paradaId ?? null,
    titulo: i.titulo ?? i.title ?? 'Incidencia',
    descripcion: i.descripcion ?? i.description ?? '',
    severidad: i.severidad ?? i.severity ?? null,
    vigente_hasta: hasta,      // cadena ISO si viene del backend
    _sev: _sevOrder(i.severidad ?? i.severity),
    _tsHasta: Number.isFinite(ts) ? ts : null,
  };
}

/**
 * Lista de incidencias (globales). Si tu backend acepta filtros por querystring,
 * puedes pasar { rutaId, paradaId } y lo añadimos a la URL; si no, filtramos en cliente.
 */
function _parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getIncidencias({ rutaId, linea, signal } = {}) {
  const params = new URLSearchParams();
  if (rutaId != null) params.set('rutaId', String(rutaId));
  if (linea) params.set('linea', String(linea));
  const qs = params.toString();
  const url = `/api/incidencias${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();

  let items = (Array.isArray(data) ? data : []).map(i => ({
    id: i.id ?? null,
    ruta_id: i.ruta_id ?? null,
    linea: i.linea ?? '',
    descripcion: i.descripcion ?? '',
    fechaISO: i.fecha ?? null,
    fecha: _parseDate(i.fecha),
  }));

  // Si el backend ignora filtros, aplica en cliente:
  if (rutaId != null) items = items.filter(x => x.ruta_id === rutaId);
  if (linea) {
    const L = String(linea).toUpperCase();
    items = items.filter(x => String(x.linea).toUpperCase() === L);
  }

  // Orden: más recientes primero
  items.sort((a, b) => (b.fecha?.getTime?.() || 0) - (a.fecha?.getTime?.() || 0));
  return items;
}

/** Incidencias de una ruta concreta: GET /rutas/{id}/incidencias */
export async function getRouteIncidencias(rutaId, { signal } = {}) {
  const res = await fetch(`/api/rutas/${encodeURIComponent(rutaId)}/incidencias`, { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  const items = (Array.isArray(data) ? data : []).map(i => ({
    id: i.id ?? null,
    ruta_id: i.ruta_id ?? rutaId,
    linea: i.linea ?? '',
    descripcion: i.descripcion ?? '',
    fechaISO: i.fecha ?? null,
    fecha: _parseDate(i.fecha),
  }));
  // más recientes primero
  items.sort((a, b) => (b.fecha?.getTime?.() || 0) - (a.fecha?.getTime?.() || 0));
  return items;
}

// Devuelve TODAS las incidencias (si tu backend expone GET /incidencias)
// Formato esperado: [{ id, ruta_id, linea, descripcion, fecha }, ...]
export async function getIncidenciasAll({ signal } = {}) {
  const res = await fetch('/api/incidencias', { signal });
  if (!res.ok) {
    // si tu backend no tiene este endpoint, devolvemos lista vacía
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}


// HORARIOS/PRÓXIMOS PASOS DE UNA PARADA
// Backend: GET /paradas/{id}/horarios[?tipo_dia=] -> lista de próximos
// Ejemplo item:
// { hora:"1970-01-01T19:43:00", linea:"L164", destino:"Xirivella", operador:"FERNANBUS", tiempo_restante:12 }
// HORARIOS/PRÓXIMOS PASOS DE UNA PARADA
// src/services/api.js
export async function getStopTimes(stopId, { tipoDia, signal } = {}) {
  const qs = tipoDia ? `?tipo_dia=${encodeURIComponent(tipoDia)}` : '';
  const res = await fetch(`/api/paradas/${encodeURIComponent(stopId)}/horarios${qs}`, { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();

  return (Array.isArray(data) ? data : []).map(x => ({
    horaISO: x.hora ?? null,
    hora: x.hora ? new Date(x.hora) : null,
    linea: String(x.linea ?? '').trim(),     
    destino: String(x.destino ?? '').trim(),   
    operador: String(x.operador ?? '').trim(), 
    minutos: typeof x.tiempo_restante === 'number' ? x.tiempo_restante : null, // 
  }));
}

