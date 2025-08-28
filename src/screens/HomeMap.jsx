import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import BottomSheet from '../components/BottomSheet.jsx';
import { getStops } from '../services/api.js';

// import 'leaflet/dist/leaflet.css';  // asegúrate de tenerlo en tu entry global

const VALENCIA = [39.4699, -0.3763];

// 🔧 a partir de este zoom se muestran las paradas
const MIN_STOP_ZOOM = 14;

// Colores de marca/estado
const BRAND_ORANGE = '#FFA300';
const RED = '#ef4444';
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

// Generador de icono Leaflet (punta del pin anclada al suelo)
function stopDivIcon(color) {
  return L.divIcon({
    className: 'stop-pin',
    html: svgPin(color),
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    tooltipAnchor: [0, -28],
  });
}

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

export default function HomeMap() {
  const mapRef = React.useRef(null);

  const [stops, setStops] = React.useState([]);          // ← paradas desde Mule
  const [loadingStops, setLoadingStops] = React.useState(false);
  const [stopsError, setStopsError] = React.useState(null);

  const [selected, setSelected] = React.useState(null);
  const [sheetState, setSheetState] = React.useState('closed'); // 'closed' | 'peek' | 'expanded'
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [tiempos, setTiempos] = React.useState([]);
  const [mapZoom, setMapZoom] = React.useState(13);

  // Carga inicial de paradas desde Mule
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

  // Color por parada (seleccionada/cabecera/intermedia)
  const colorParada = (s, selectedId) => {
    if (s.id === selectedId) return BRAND_ORANGE;
    // si tu API no trae 'tipo', puedes usar un criterio alternativo (por ahora todo azul)
    return BLUE;
  };

  async function handleStopClick(stop) {
    setSelected(stop);
    setSheetState('peek');
    setCargando(true);
    setError(null);
    try {
      // TODO: sustituir por tu endpoint real de tiempos
      await new Promise((r) => setTimeout(r, 250));
      const data = [
        { linea: '164', destino: 'Valencia (Nou d’Octubre)', operador: 'MetroBus', minutos: 5 },
        { linea: '164', destino: 'Torrent', operador: 'MetroBus', minutos: 17 },
      ];
      setTiempos(data);

      // Desplaza para que no lo tape el sheet
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
    <div
      className="relative w-screen h-screen"
      style={{ paddingBottom: 'var(--nav-h,56px)' }}
    >
      {/* Aviso zoom */}
      {!showStops && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-3 z-[1150]">
          <div className="rounded-full bg-white/95 backdrop-blur border border-gray-200 px-3 py-1 text-xs text-gray-700 shadow">
            Acércate para ver paradas (zoom ≥ {MIN_STOP_ZOOM})
          </div>
        </div>
      )}

      {/* Estado de carga/errores de paradas */}
      {stopsError && (
        <div className="absolute left-1/2 -translate-x-1/2 top-14 z-[1150]">
          <div className="rounded bg-red-50 border border-red-200 text-red-700 px-3 py-1 text-xs shadow">
            {stopsError}
          </div>
        </div>
      )}
      {loadingStops && (
        <div className="absolute left-1/2 -translate-x-1/2 top-14 z-[1150]">
          <div className="rounded bg-white/95 border border-gray-200 text-gray-700 px-3 py-1 text-xs shadow">
            Cargando paradas…
          </div>
        </div>
      )}

      <MapContainer
        center={VALENCIA}
        zoom={13}
        whenCreated={(m) => { mapRef.current = m; setMapZoom(m.getZoom()); }}
        className="h-full w-full"
        attributionControl
        zoomControl={false}
        scrollWheelZoom={true}
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

        {showStops && stops.map((s) => {
          const color = colorParada(s, selectedId);
          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={stopDivIcon(color)}
              eventHandlers={{
                click: () => handleStopClick(s),
                touchstart: () => handleStopClick(s),
              }}
            />
          );
        })}
      </MapContainer>

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
