import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import BottomSheet from '../components/BottomSheet.jsx';
import { getStops } from '../services/api.js';

// import 'leaflet/dist/leaflet.css';  // Asegúrate de tenerlo en tu entry global (main.jsx o index.html)

const VALENCIA = [39.4699, -0.3763];
const MIN_STOP_ZOOM = 14;

const BRAND_ORANGE = '#FFA300';
const BLUE = '#3b82f6';

// SVG inline para el pin de parada
function svgPin(color = BRAND_ORANGE) {
  return `
<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="10" r="10" fill="rgba(255,255,255,0.9)"/>
  <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" fill="${color}" />
  <circle cx="12" cy="10" r="2.6" fill="white"/>
</svg>`;
}

function stopDivIcon(color) {
  return L.divIcon({
    className: 'stop-pin',
    html: svgPin(color),
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    tooltipAnchor: [0, -28],
  });
}

// Tipo de día para tu endpoint
const tipoDiaAuto = () => {
  const dow = new Date().getDay(); // 0=Dom, 6=Sáb
  if (dow === 0) return 'D';
  if (dow === 6) return 'S';
  return 'LV';
};

// Hook interno para seguir el zoom del mapa
function ZoomWatcher({ onChange }) {
  const map = useMapEvents({
    zoomend: () => onChange(map.getZoom()),
  });
  React.useEffect(() => {
    onChange(map.getZoom());
  }, [map, onChange]);
  return null;
}

// Normaliza el JSON de Mule a lo que usa el BottomSheet
function normalizeTimesFromMule(items) {
  const arr = Array.isArray(items) ? items : [];
  const out = [];
  for (const t of arr) {
    const mins = Number(t.tiempo_restante);
    if (!Number.isFinite(mins)) continue;
    out.push({
      linea: t.linea ?? '',
      destino: t.destino ?? '',
      operador: t.operador ?? '',
      minutos: Math.max(0, Math.round(mins)),
      hora: (typeof t.hora === 'string' && t.hora.match(/T(\d{2}):(\d{2})/)) ? RegExp.$1 + ':' + RegExp.$2 : null,
    });
  }
  out.sort((a, b) => a.minutos - b.minutos);
  return out;
}

export default function HomeMap() {
  const mapRef = React.useRef(null);

  // Geolocalización
  const [userPos, setUserPos] = React.useState(null);   // {lat, lng}
  const [locating, setLocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState(null);

  // Función única para localizar usando Leaflet (más robusto y acoplado al mapa)
  const locateNow = React.useCallback((fly = false) => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);
    setGeoError(null);

    // Escucha una sola vez resultados/errores
    const onFound = (e) => {
      const { lat, lng } = e.latlng || {};
      if (typeof lat === 'number' && typeof lng === 'number') {
        setUserPos({ lat, lng });
        const targetZoom = Math.max(map.getZoom() || 0, 16);
        if (fly) map.flyTo([lat, lng], targetZoom);
        else map.setView([lat, lng], targetZoom, { animate: false });
      }
      setLocating(false);
      map.off('locationfound', onFound);
      map.off('locationerror', onError);
    };
    const onError = (err) => {
      setGeoError(err?.message || 'No se pudo obtener la ubicación.');
      setLocating(false);
      map.off('locationfound', onFound);
      map.off('locationerror', onError);
    };

    map.on('locationfound', onFound);
    map.on('locationerror', onError);

    // Importante: iOS/Safari requiere HTTPS o localhost
    map.locate({
      setView: false,            // centramos nosotros (fly/setView arriba)
      watch: false,
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 10000,
    });
  }, []);

  // Al crear el mapa: guarda la instancia y arranca localización automática
  const handleMapCreated = React.useCallback((m) => {
    mapRef.current = m;
    setMapZoom(m.getZoom());
    // Intento de centrado inicial (si deniega, se queda en VALENCIA)
    locateNow(false);
  }, [locateNow]);

  // Datos de paradas
  const [stops, setStops] = React.useState([]);
  const [loadingStops, setLoadingStops] = React.useState(false);
  const [stopsError, setStopsError] = React.useState(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingStops(true);
        setStopsError(null);
        const data = await getStops({ signal: ctrl.signal });
        setStops(data);
      } catch (e) {
        if (e.name !== 'AbortError') setStopsError(e.message || 'Error cargando paradas');
      } finally {
        setLoadingStops(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // UI state
  const [selected, setSelected] = React.useState(null);
  const [sheetState, setSheetState] = React.useState('closed'); // 'closed' | 'peek' | 'expanded'
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [tiempos, setTiempos] = React.useState([]);
  const [mapZoom, setMapZoom] = React.useState(13);

  // Color de parada (seleccionada vs resto)
  const colorParada = (s, selectedId) => (s.id === selectedId ? BRAND_ORANGE : BLUE);

  async function handleStopClick(stop) {
    setSelected(stop);
    setSheetState('peek');       //  abre en peek (2 buses)
    setCargando(true);
    setError(null);

    try {
      const td = tipoDiaAuto();
      const res = await fetch(`/api/paradas/${encodeURIComponent(stop.id)}/horarios?tipo_dia=${td}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Error ${res.status}: ${txt || res.statusText}`);
      }
      const raw = await res.json();
      const data = normalizeTimesFromMule(raw);
      setTiempos(data);

      // Pan con pequeño offset vertical para no tapar con el sheet
      const map = mapRef.current;
      if (map) {
        const z = map.getZoom();
        const target = L.latLng(stop.lat, stop.lng);
        const off = map.project(target, z).subtract([0, 140]);
        map.panTo(map.unproject(off, z), { animate: true });
      }
    } catch (e) {
      setError(e?.message || 'Error al cargar tiempos.');
      setTiempos([]);
    } finally {
      setCargando(false);
    }
  }

  const selectedId = selected?.id ?? null;
  const showStops = mapZoom >= MIN_STOP_ZOOM;

  return (
    <div className="relative w-screen h-screen" style={{ paddingBottom: 'var(--nav-h,56px)' }}>
      {/* Avisos/estado */}
      {!showStops && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-3 z-[1150]">
          <div className="rounded-full bg-white/95 backdrop-blur border border-gray-200 px-3 py-1 text-xs text-gray-700 shadow">
            Acércate para ver paradas (zoom ≥ {MIN_STOP_ZOOM})
          </div>
        </div>
      )}
      {stopsError && (
        <div className="absolute left-1/2 -translate-x-1/2 top-14 z-[1150]">
          <div className="rounded bg-red-50 border border-red-200 text-red-700 px-3 py-1 text-xs shadow">
            {stopsError}
          </div>
        </div>
      )}
      {geoError && (
        <div className="absolute left-3 top-3 z-[1200] rounded bg-white/90 backdrop-blur px-3 py-2 text-xs text-gray-800 shadow max-w-[70vw]">
          {geoError.includes('secure') || geoError.includes('HTTPS')
            ? 'Safari/iOS requiere HTTPS o localhost para usar la ubicación.'
            : geoError}
        </div>
      )}

      {/* Botón “mi ubicación” (reintenta y centra) */}
      <div className="absolute top-3 right-3 z-[1200]">
        <button
          onClick={() => locateNow(true)}
          className="rounded-md border border-gray-300 bg-white/90 backdrop-blur px-3 py-2 text-sm text-gray-800 shadow hover:bg-white disabled:opacity-50"
          title={locating ? 'Obteniendo ubicación…' : 'Centrar en mi ubicación'}
          disabled={locating}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </div>

      <MapContainer
        center={VALENCIA}           // fallback si no hay permisos/ubicación
        zoom={13}
        whenCreated={handleMapCreated}
        className="h-full w-full"
        attributionControl
        zoomControl={false}
        scrollWheelZoom
        touchZoom
        tap
        preferCanvas
        aria-label="Mapa de paradas"
        role="region"
      >
        <ZoomWatcher onChange={setMapZoom} />

        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Puntero “estoy aquí” */}
        {userPos && (
          <>
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={7}
              pathOptions={{ color: BLUE, fillColor: BLUE, fillOpacity: 0.9 }}
            />
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={14}
              pathOptions={{ color: BLUE, fillColor: BLUE, fillOpacity: 0.15, opacity: 0 }}
            />
          </>
        )}

        {/* Paradas */}
        {showStops && stops.map((s) => {
          const color = colorParada(s, selectedId);
          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}          // asumiendo que api.js ya normaliza latitud/longitud -> lat/lng
              icon={stopDivIcon(color)}
              eventHandlers={{
                click: () => handleStopClick(s),
                touchstart: () => handleStopClick(s),
              }}
            />
          );
        })}
      </MapContainer>

      {/* BottomSheet (peek=2 buses, expandido=todos) */}
      <BottomSheet
        state={sheetState}
        onStateChange={setSheetState}
        parada={selected}
        cargando={cargando}
        error={error}
        tiempos={tiempos}
      />
    </div>
  );
}
