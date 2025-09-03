// src/screens/Stops.jsx
import React from 'react';
import { getStops, getStopTimes } from '../services/api.js';

// Iconos
function IconSearch(props){return(
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
    <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);}
function IconArrowLeft(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M15 18 9 12l6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);}
function IconBus(props){return(
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
    <rect x="4" y="3" width="16" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 16v2M18 16v2M6 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="20" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
  </svg>
);}

function fmtClock(horaISO) {
  if (!horaISO) return '—';
  const d = new Date(horaISO);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  const m = String(horaISO).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

// ⬇️ Deduplicar SOLO por linea (sin operador)
function linesFromTimes(times) {
  const set = new Set();
  for (const t of times || []) {
    const linea = String(t?.linea || '').trim();
    if (!linea) continue;
    set.add(linea);
  }
  return Array.from(set.values()).sort((a,b)=>a.localeCompare(b));
}

export default function Stops({ initialQuery = '' }) {
  const [stops, setStops] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // buscador (se resetea al remount por el key/nonce de App.jsx)
  const [q, setQ] = React.useState(initialQuery);
  React.useEffect(() => { setQ(initialQuery || ''); }, [initialQuery]);

  // Overlay detalle
  const [detail, setDetail] = React.useState(null);
  const [detailTimes, setDetailTimes] = React.useState([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState(null);

  // Cache de líneas por parada para el LISTADO: { [id]: string[] } (solo nombres de líneas)
  const [linesCache, setLinesCache] = React.useState({});

  // Prefetch simple por “páginas” de 30
  const [prefetchCount, setPrefetchCount] = React.useState(30);

  // Cargar paradas
  React.useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await getStops({ signal: ctrl.signal });
        data.sort((a,b) => Number(a.id) - Number(b.id));
        setStops(data);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'Error cargando paradas');
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // Filtro
  const filtered = React.useMemo(() => {
    if (!q.trim()) return stops;
    const t = q.trim().toLowerCase();
    return stops.filter(s =>
      String(s.id).toLowerCase().includes(t) ||
      String(s.nombre || '').toLowerCase().includes(t)
    );
  }, [stops, q]);

  // Prefetch de líneas para las primeras `prefetchCount` paradas del listado filtrado
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const slice = filtered.slice(0, prefetchCount);
      for (const s of slice) {
        if (!alive) return;
        if (linesCache[s.id]) continue; // ya cacheado
        try {
          const times = await getStopTimes(s.id);
          const items = linesFromTimes(times); // ← array de strings (lineas)
          if (!alive) return;
          setLinesCache(prev => ({ ...prev, [s.id]: items }));
        } catch {
          if (!alive) return;
          setLinesCache(prev => ({ ...prev, [s.id]: [] })); // marca vacío en error
        }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, prefetchCount]);

  // Abrir/cerrar detalle
  function openDetail(stop) {
    setDetail(stop);
    setDetailTimes([]);
    setDetailError(null);
    setDetailLoading(true);
    (async () => {
      try {
        const items = await getStopTimes(stop.id);
        setDetailTimes(items);
        // también actualiza cache (útil si no estaba en primeras 30)
        const chips = linesFromTimes(items);
        setLinesCache(prev => prev[stop.id] ? prev : ({ ...prev, [stop.id]: chips }));
      } catch (e) {
        setDetailError(e.message || 'No se pudieron cargar los horarios');
      } finally {
        setDetailLoading(false);
      }
    })();
  }
  function closeDetail() {
    setDetail(null);
    setDetailTimes([]);
    setDetailError(null);
    setDetailLoading(false);
  }

  const detailLines = React.useMemo(() => linesFromTimes(detailTimes), [detailTimes]);

  return (
    <div id="panel-stops" className="p-4" style={{ paddingBottom: 'var(--nav-h,56px)' }}>
      {/* Buscador */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur -mx-4 px-4 pt-2 pb-3 border-b border-gray-100">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconSearch/></span>
          <input
            type="search"
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Buscar por ID o nombre…"
            className="w-full rounded-full border border-gray-300 bg-gray-100 pl-9 pr-4 py-2 text-sm
                       text-gray-900 caret-gray-900 placeholder-gray-500 focus:outline-none
                       focus:border-[#FFA300] focus:ring-2 focus:ring-[#FFA300]/30"
            aria-label="Buscar paradas"
          />
        </div>
      </div>

      {/* Estados */}
      {error && <div className="mt-3 rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading && <div className="mt-3 text-sm text-gray-600">Cargando paradas…</div>}

      {/* Listado */}
      <ul className="mt-3 space-y-2">
        {filtered.slice(0, prefetchCount).map((s) => {
          const chips = linesCache[s.id]; // undefined -> precargando, [] -> sin líneas
          return (
            <li key={s.id}>
              <button
                onClick={() => openDetail(s)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 leading-tight">
                      {s.id} <span className="text-gray-500 font-normal">—</span> {s.nombre || '—'}
                    </div>

                    {/* Chips/resumen en el LISTADO (solo línea) */}
                    {!chips && (
                      <div className="mt-0.5 text-[11px] text-gray-500">Cargando líneas…</div>
                    )}
                    {chips && chips.length === 0 && (
                      <div className="mt-0.5 text-[11px] text-gray-500">Sin líneas detectadas</div>
                    )}
                    {chips && chips.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {chips.slice(0,4).map((linea) => (
                          <span
                            key={linea}
                            className="px-1.5 py-0.5 rounded-full border border-[#FFA300] text-[#FFA300] text-[11px] font-medium"
                          >
                            {linea}
                          </span>
                        ))}
                        {chips.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded-full border border-gray-300 text-[11px] text-gray-700">
                            +{chips.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 self-center text-[#FFA300]">
                    <IconBus />
                  </div>
                </div>
              </button>
            </li>
          );
        })}

        {/* Cargar más líneas para más filas del listado */}
        {filtered.length > prefetchCount && (
          <li className="pt-2">
            <button
              onClick={()=>setPrefetchCount(c => c + 30)}
              className="w-full text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 py-2 text-gray-800"
            >
              Cargar más líneas
            </button>
          </li>
        )}

        {!loading && !error && filtered.length === 0 && (
          <li className="text-sm text-gray-600">No hay paradas que coincidan.</li>
        )}
      </ul>

      {/* Ventana de detalle (overlay) */}
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
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">
                {detail.id} — {detail.nombre || '—'}
              </div>
              {/* Chips en el header del DETALLE (solo línea) */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {detailLoading && <span className="text-xs text-gray-600">Cargando líneas…</span>}
                {!detailLoading && detailLines.length === 0 && (
                  <span className="text-xs text-gray-600">Sin líneas detectadas</span>
                )}
                {!detailLoading && detailLines.map((linea) => (
                  <span
                    key={linea}
                    className="px-2 py-0.5 rounded-full border border-[#FFA300] text-[#FFA300] text-[11px] font-medium"
                  >
                    {linea}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full h-[calc(100%-56px)] overflow-auto">
            <div className="p-4 space-y-3">
              {detailLoading && <div className="text-sm text-gray-600">Cargando próximos pasos…</div>}
              {detailError && <div className="text-sm text-red-600">{detailError}</div>}

              {!detailLoading && !detailError && (
                <>
                  <h2 className="text-sm font-semibold text-gray-800">Próximos buses</h2>
                  {detailTimes.length === 0 ? (
                    <div className="text-sm text-gray-600">No hay estimaciones disponibles.</div>
                  ) : (
                    <ul className="space-y-2">
                      {detailTimes.map((t, idx) => (
                        <li key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {t.linea && (
                                  <span className="px-2 py-0.5 rounded-full border border-[#FFA300] text-[#FFA300] text-xs font-medium">
                                    {t.linea}
                                  </span>
                                )}
                                {t.destino && (
                                  <span className="text-sm text-gray-900">{t.destino}</span>
                                )}
                              </div>
                              {/* Puedes dejar el operador en la lista de próximos buses si quieres;
                                  si también lo quieres quitar, borra el bloque de abajo */}
                              {t.operador && (
                                <div className="text-xs text-gray-600 mt-0.5">{t.operador}</div>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {t.minutos != null ? `${t.minutos} min` : '—'}
                              </div>
                              <div className="text-xs text-gray-600">{fmtClock(t.horaISO)}</div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
