// src/screens/Lines.jsx
import React from 'react';
import { getRoutes, getRouteIncidencias, getIncidenciasAll } from '../services/api.js';
import PdfViewer from '../components/PdfViewer.jsx';

// Iconos
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
function IconArrowLeft(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M15 18 9 12l6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);}
function IconAlert(props){return(
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
    <path d="M12 2 2 20h20L12 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="1.2" fill="currentColor"/>
  </svg>
);}

// Utilidades
function buildLocalPdfUrl(route) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/,'');
  const raw = (route?.linea ?? route?.id ?? '').toString();
  const code = raw.toUpperCase().replace(/\s+/g,''); // "L 164" -> "L164"
  return code ? `${base}/pdfs/${code}.pdf` : null;
}
function fmtDate(d) {
  if (!d) return '—';
  return d.toLocaleString('es-ES', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function Lines() {
  const [routes, setRoutes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState('asc');
  const [opFilter, setOpFilter] = React.useState('');
  const [filterOpen, setFilterOpen] = React.useState(false);

  const [detail, setDetail] = React.useState(null); // { route, pdfUrl }

  // Incidencias cargadas bajo demanda (panel desplegable)
  const [incByRoute, setIncByRoute] = React.useState({});

  // Mapa de "esta ruta tiene incidencias?" -> para decidir si mostramos el icono
  const [hasIncSet, setHasIncSet] = React.useState(() => new Set());

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

  // Cargar incidencias globales (si existe el endpoint) para saber qué rutas tienen incidencias
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await getIncidenciasAll().catch(() => []);
        if (!alive) return;
        const s = new Set();
        for (const it of Array.isArray(all) ? all : []) {
          if (it && (it.ruta_id != null)) s.add(it.ruta_id);
        }
        setHasIncSet(s);
      } catch {
        setHasIncSet(new Set()); // si falla, no mostramos iconos
      }
    })();
    return () => { alive = false; };
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

  function openDetail(route) {
    const pdfUrl = buildLocalPdfUrl(route);
    setDetail({ route, pdfUrl });
  }
  function closeDetail(){ setDetail(null); }

  // Toggle incidencias de una ruta; carga bajo demanda
  async function toggleIncidencias(route, e) {
    e?.stopPropagation(); // no abrir el PDF
    const id = route.id;
    setIncByRoute(prev => {
      const cur = prev[id];
      if (cur && (cur.items || cur.loading || cur.error)) {
        return { ...prev, [id]: { ...cur, open: !cur.open } };
      }
      return { ...prev, [id]: { open: true, loading: true, error: null, items: [] } };
    });

    if (incByRoute[id]?.items?.length) return;

    try {
      const items = await getRouteIncidencias(id);
      setIncByRoute(prev => ({ ...prev, [id]: { ...(prev[id]||{}), loading: false, items } }));
    } catch (err) {
      setIncByRoute(prev => ({ ...prev, [id]: { ...(prev[id]||{}), loading: false, error: err.message || 'Error' } }));
    }
  }

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
                className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-3 z-20 text-gray-900"
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
                    className="tw-select w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-[#FFA300] focus:ring-2 focus:ring-[#FFA300]/30"
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
        {filteredSorted.map((r) => {
          const inc = incByRoute[r.id];
          const showAlert = hasIncSet.has(r.id); // 👈 solo mostramos si sabemos que hay incidencias

          return (
            <li key={r.id} className="rounded-xl border border-gray-200 bg-white">
              {/* Cabecera del item (abre PDF al tocar el bloque principal) */}
              <div
                className="w-full text-left p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => openDetail(r)}
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

                  <div className="shrink-0 self-center flex items-center gap-2">
                    <div className="text-xs sm:text-sm text-gray-600">{r.operador || '—'}</div>

                    {/* Botón incidencias: SOLO si hay */}
                    {showAlert && (
                      <button
                        onClick={(e) => toggleIncidencias(r, e)}
                        title="Ver incidencias de esta línea"
                        aria-label="Ver incidencias de esta línea"
                        className="w-9 h-9 grid place-items-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-[#FFA300]"
                      >
                        <IconAlert />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel plegable de incidencias */}
              {inc?.open && (
                <div className="px-3 pb-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    {inc.loading && <div className="text-sm text-amber-800">Cargando incidencias…</div>}
                    {inc.error && <div className="text-sm text-red-700">{inc.error}</div>}
                    {!inc.loading && !inc.error && (inc.items?.length ?? 0) === 0 && (
                      <div className="text-sm text-amber-800">No hay incidencias para esta línea.</div>
                    )}
                    {!inc.loading && !inc.error && (inc.items?.length ?? 0) > 0 && (
                      <ul className="space-y-2">
                        {inc.items.map(item => (
                          <li key={item.id ?? item.fechaISO}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 text-sm text-gray-900">{item.descripcion}</div>
                              <div className="shrink-0 text-xs text-gray-600">{fmtDate(item.fecha)}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {!loading && !error && filteredSorted.length === 0 && (
          <li className="text-sm text-gray-600">No hay líneas que coincidan.</li>
        )}
      </ul>

      {/* Overlay con PDF */}
      {detail && (
        <div className="fixed inset-0 z-[1300] bg-white">
          <div className="flex items-center gap-2 p-3 border-b border-gray-200">
            <button
              onClick={closeDetail}
              aria-label="Volver atrás"
              title="Atrás"
              className="w-10 h-10 grid place-items-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-[#FFA300]"
            >
              <IconArrowLeft />
            </button>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{detail.route.linea || detail.route.id}</div>
              <div className="text-xs text-gray-600 truncate">{detail.route.operador || '—'}</div>
            </div>
            <div className="ml-auto text-[11px] text-gray-500 truncate max-w-[50vw]">
              {detail.pdfUrl ?? '—'}
            </div>
          </div>

          <div className="w-full h-[calc(100%-56px)]">
            <PdfViewer url={detail.pdfUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
