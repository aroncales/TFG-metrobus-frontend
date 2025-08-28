
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