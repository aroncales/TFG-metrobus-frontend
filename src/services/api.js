
export async function getStops({ signal } = {}) {
  const res = await fetch('/api/paradas', { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  /** Esperamos un array con: { id, nombre, latitud, longitud } */
  const data = await res.json();
  // Adaptamos a { id, nombre, lat, lng } para Leaflet
  return (Array.isArray(data) ? data : []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    lat: Number(s.latitud),
    lng: Number(s.longitud),
  })).filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

// --- RUTAS ---
export async function getRoutes({ signal } = {}) {
  const res = await fetch('/api/rutas', { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  // Formato real: [{ id, linea, origen, destino, operador }]
  return (Array.isArray(data) ? data : []).map(r => ({
    id: r.id,
    linea: r.linea ?? '',        // ← usar este campo para mostrar/ordenar/buscar
    operador: r.operador ?? '',
    origen: r.origen ?? '',
    destino: r.destino ?? '',
  }));
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
export async function getIncidencias({ rutaId, paradaId, signal } = {}) {
  const params = new URLSearchParams();
  if (rutaId != null) params.set('rutaId', String(rutaId));
  if (paradaId != null) params.set('paradaId', String(paradaId));
  const qs = params.toString();
  const url = `/api/incidencias${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  let items = (Array.isArray(data) ? data : []).map(_normalizeInc);

  // Si el backend no soporta filtros por query, aplica en cliente:
  if (rutaId != null) items = items.filter(i => i.ruta_id === rutaId);
  if (paradaId != null) items = items.filter(i => i.parada_id === paradaId);

  // Orden sugerido: severidad (desc) y luego fecha de fin más próxima
  items.sort((a, b) => {
    if (b._sev !== a._sev) return b._sev - a._sev;
    const at = a._tsHasta ?? Infinity, bt = b._tsHasta ?? Infinity;
    return at - bt;
  });

  // Limpia campos internos
  return items.map(({ _sev, _tsHasta, ...rest }) => rest);
}

/** Incidencias de una ruta concreta: GET /rutas/{id}/incidencias */
export async function getRouteIncidencias(rutaId, { signal } = {}) {
  const res = await fetch(`/api/rutas/${encodeURIComponent(rutaId)}/incidencias`, { signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  const items = (Array.isArray(data) ? data : []).map(_normalizeInc);
  items.sort((a, b) => {
    if (b._sev !== a._sev) return b._sev - a._sev;
    const at = a._tsHasta ?? Infinity, bt = b._tsHasta ?? Infinity;
    return at - bt;
  });
  return items.map(({ _sev, _tsHasta, ...rest }) => rest);
}


