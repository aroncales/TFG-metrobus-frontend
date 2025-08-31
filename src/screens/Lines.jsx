import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRoutes, getRouteStops } from '../services/api.js';

// import 'leaflet/dist/leaflet.css'; // ya lo tendrás en el entry global

const BRAND = '#FFA300';

function IconSearch(props){return(
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
    <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);}
function IconFilter(props){return(
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
    <path d="M3 5h18M6 12h12M10 19h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);}
function IconBack(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M15 18 9 12l6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);}

export default function Lines() {
  const [routes, setRoutes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState('asc'); // 'asc' | 'desc'
  const [opFilter, setOpFilter] = React.useState(''); // operador
  const [filterOpen, setFilterOpen] = React.useState(false);

  const [detail, setDetail] = React.useState(null); // { route, coords: [ [lat,lng], ... ] }
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await getRoutes({ signal: ctrl.signal });
        setRoutes(data);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'Error cargando rutas');
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const operadores = React.useMemo(() => {
    const set = new Set(routes.map(r => r.operador).filter(Boolean));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [routes]);

  const filteredSorted = React.useMemo(() => {
    let arr = routes;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter(r =>
        String(r.linea).toLowerCase().includes(t) ||
        String(r.id).toLowerCase().includes(t) ||
        String(r.operador||'').toLowerCase().includes(t) ||
        String(r.origen||'').toLowerCase().includes(t) ||
        String(r.destino||'').toLowerCase().includes(t)
      );
    }
    if (opFilter) arr = arr.filter(r => r.operador === opFilter);
    arr = [...arr].sort((a,b)=>{
      const A = (rLabel(a)).toLowerCase();
      const B = (rLabel(b)).toLowerCase();
      return sort === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
    });
    return arr;
  }, [routes, q, opFilter, sort]);

  function rLabel(r){ return r.linea || String(r.id); }

  async function openDetail(route) {
    setDetail({ route, coords: [] });
    setDetailLoading(true); setDetailError(null);
    try {
      const stops = await getRouteStops(route.id);
      const coords = stops.map(s => [s.lat, s.lng]);
      setDetail({ route, coords });
    } catch (e) {
      setDetailError(e.message || 'No se pudieron cargar las paradas');
    } finally {
      setDetailLoading(false);
    }
  }

  function FitToLine({ coords }) {
  const map = useMap();
  React.useEffect(() => {
    if (coords && coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [24, 24] });
    } else if (coords && coords.length === 1) {
      map.setView(coords[0], 15);
    }
  }, [map, coords]);
  return null;
}



  function closeDetail(){ setDetail(null); setDetailError(null); setDetailLoading(false); }

  return (
    <div id="panel-lines" className="p-4" style={{ paddingBottom: 'var(--nav-h,56px)' }}>
      {/* Buscador + filtro */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur -mx-4 px-4 pt-2 pb-3 border-b border-gray-100">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconSearch/></span>
            <input
              type="search"
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Buscar línea…"
              className="w-full rounded-full border border-gray-300 bg-gray-100 pl-9 pr-4 py-2 text-sm
                         placeholder-gray-500 focus:outline-none focus:border-[#FFA300] focus:ring-2 focus:ring-[#FFA300]/30"
              aria-label="Buscar líneas"
            />
          </div>

          <div className="relative">
            <button
              onClick={()=>setFilterOpen(v=>!v)}
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 flex items-center gap-2"
            >
              <IconFilter/> Filtros
            </button>

            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filtros de líneas"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-3 z-20"
              >
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Ordenar</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={()=>setSort('asc')}
                      className={`px-2 py-1 rounded-md border text-sm ${
                        sort==='asc' ? 'border-[#FFA300] text-[#FFA300] bg-[#FFA300]/10' : 'border-gray-300'
                      }`}
                    >
                      Ascendente
                    </button>
                    <button
                      onClick={()=>setSort('desc')}
                      className={`px-2 py-1 rounded-md border text-sm ${
                        sort==='desc' ? 'border-[#FFA300] text-[#FFA300] bg-[#FFA300]/10' : 'border-gray-300'
                      }`}
                    >
                      Descendente
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Operador</div>
                  <select
                    value={opFilter}
                    onChange={e=>setOpFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="">Todos</option>
                    {operadores.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={()=>{setOpFilter(''); setSort('asc');}} className="text-sm text-gray-600">Limpiar</button>
                  <button onClick={()=>setFilterOpen(false)} className="text-sm text-[#FFA300] font-medium">Aplicar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estados */}
      {error && (
        <div className="mt-3 rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {loading && <div className="mt-3 text-sm text-gray-600">Cargando líneas…</div>}

      {/* Listado */}
<ul className="mt-3 space-y-2">
  {filteredSorted.map((r) => (
    <li key={r.id}>
      <button
        onClick={() => openDetail(r)}
        className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold text-gray-900 leading-tight truncate">
              {r.linea || r.id}
            </div>
            {(r.origen || r.destino) && (
              <div className="mt-0.5 text-xs sm:text-sm text-gray-700 truncate">
                {r.origen || '—'} <span className="mx-1">→</span> {r.destino || '—'}
              </div>
            )}
          </div>

          <div className="shrink-0 self-center text-xs sm:text-sm text-gray-600">
            {r.operador || '—'}
          </div>
        </div>
      </button>
    </li>
  ))}
  {!loading && !error && filteredSorted.length === 0 && (
    <li className="text-sm text-gray-600">No hay líneas que coincidan.</li>
  )}
</ul>


      {/* Detalle con mapa (overlay) */}
      {detail && (
        <div className="fixed inset-0 z-[1300] bg-white">
          <div className="flex items-center gap-2 p-3 border-b border-gray-200">
            <button onClick={closeDetail} aria-label="Volver" className="w-9 h-9 grid place-items-center rounded-md border border-gray-200 bg-white">
              <IconBack/>
            </button>
            <div>
              <div className="font-semibold text-gray-900">{detail.route.linea || detail.route.id}</div>
              <div className="text-xs text-gray-600">{detail.route.operador || '—'}</div>
            </div>
            <div className="ml-auto text-xs text-gray-600">
              {detailLoading ? 'Cargando recorrido…' : (detailError ? <span className="text-red-600">{detailError}</span> : `${detail.coords.length} puntos`)}
            </div>
          </div>

          <div className="w-full h-[calc(100%-56px)]">
            <MapContainer
              center={[39.4699, -0.3763]}
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
              attributionControl={true}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {detail.coords.length > 0 && <FitToLine coords={detail.coords} />}

              {detail.coords.length > 1 ? (
                <>
                  <Polyline positions={detail.coords} pathOptions={{ color: BRAND, weight: 5, opacity: 0.9 }} />
                  <Marker position={detail.coords[0]} icon={L.divIcon({className:'', html:'<div style="width:10px;height:10px;background:#16a34a;border-radius:9999px;border:2px solid white"></div>'})}/>
                  <Marker position={detail.coords[detail.coords.length-1]} icon={L.divIcon({className:'', html:'<div style="width:10px;height:10px;background:#ef4444;border-radius:9999px;border:2px solid white"></div>'})}/>
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded bg-white/95 backdrop-blur border border-gray-200 px-3 py-1 text-sm text-gray-700">
                    {detailLoading ? 'Cargando…' : 'Recorrido no disponible todavía'}
                  </div>
                </div>
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
