import React from 'react';
import { getIncidencias } from '../services/api.js';

export default function Incidents() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await getIncidencias({ signal: ctrl.signal }).catch(() => []);
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'Error cargando incidencias');
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return (
    <div id="panel-incidents" className="p-4" style={{ paddingBottom: 'var(--nav-h,56px)' }}>
      <h1 className="text-lg font-semibold mb-2">Incidencias</h1>

      {loading && <p className="text-sm text-gray-600">Cargando incidencias…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2 mt-2">
        {items.map((it) => (
          <li key={it.id ?? `${it.ruta_id}-${it.parada_id}-${it.titulo ?? ''}`}>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{it.titulo ?? 'Incidencia'}</div>
                  {it.descripcion && <div className="text-sm text-gray-700 mt-0.5">{it.descripcion}</div>}
                  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                    {it.ruta_id && <span className="px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100">Ruta {it.ruta_id}</span>}
                    {it.parada_id && <span className="px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100">Parada {it.parada_id}</span>}
                    {it.severidad && <span className="px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100">Severidad: {it.severidad}</span>}
                    {it.vigente_hasta && <span className="px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100">Hasta: {String(it.vigente_hasta).replace('T',' ').slice(0,16)}</span>}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-600">No hay incidencias activas.</p>
      )}
    </div>
  );
}
