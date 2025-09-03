import React from 'react';
import { getIncidencias } from '../services/api.js';

function fmtDate(d) {
  if (!d) return '—';
  return d.toLocaleString('es-ES', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function Incidents() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await getIncidencias({ signal: ctrl.signal });
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
      <h1 className="text-lg font-semibold mb-2 text-gray-900">Incidencias</h1>

      {loading && <p className="text-sm text-gray-600">Cargando incidencias…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2 mt-2">
        {items.map((it) => (
          <li key={it.id ?? `${it.linea}-${it.fechaISO ?? ''}`}>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {it.linea && (
                      <span className="px-2 py-0.5 rounded-full border border-[#FFA300] text-[#FFA300] text-xs font-medium">
                        {it.linea}
                      </span>
                    )}
                  </div>
                  {it.descripcion && (
                    <div className="text-sm text-gray-900 mt-1">
                      {it.descripcion}
                    </div>
                  )}
                </div>
                <div className="shrink-0 self-start text-xs text-gray-600">
                  {fmtDate(it.fecha)}
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
