import React from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Invalida tamaño y centra al expandir
function FitOnExpand({ center, zoom = 17, active }) {
  const map = useMap();
  React.useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => {
      map.invalidateSize();
      if (center) map.setView(center, zoom, { animate: false });
    }, 0);
    return () => clearTimeout(id);
  }, [map, center, zoom, active]);
  return null;
}

export default function BottomSheet({
  state = 'peek',              // 'closed' | 'peek' | 'expanded'
  onStateChange,
  parada,
  cargando,
  error,
  tiempos,
  // peekHeight ya no se usa para tamaño fijo; ahora es auto-ajustado.
}) {
  const sheetRef = React.useRef(null);
  const drag = React.useRef({ active:false, startY:0, lastY:0, lastT:0, dy:0, vy:0 });

  // Altura viewport y altura real de la barra inferior (CSS var --nav-h)
  const [viewportH, setViewportH] = React.useState(
    typeof window !== 'undefined'
      ? Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
      : 0
  );
  const [navH, setNavH] = React.useState(56);

  React.useEffect(() => {
    const onResize = () => {
      const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      setViewportH(h);
      const v = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
      ) || 56;
      setNavH(v);
    };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // --------- ALTURA AUTO para el peek (medida del contenido) ---------
  const [peekAutoH, setPeekAutoH] = React.useState(() => Math.round(viewportH * 0.35));
  const maxPeekH = Math.round(viewportH * 0.60); // límite superior del peek (60% pantalla)

  // Mide la altura total del sheet cuando está en peek (handle + header + body con 2 items)
  React.useEffect(() => {
    if (state !== 'peek') return;
    const el = sheetRef.current;
    if (!el) return;

    // Medimos con height:auto
    const prev = el.style.height;
    el.style.height = 'auto';
    // rAF para asegurar layout actualizado
    const id = requestAnimationFrame(() => {
      const measured = el.scrollHeight || el.offsetHeight || 0;
      const h = measured ? Math.min(measured, maxPeekH) : Math.round(viewportH * 0.35);
      setPeekAutoH(h);
      el.style.height = prev;
    });
    return () => cancelAnimationFrame(id);
  // Re-medimos si cambian datos/viewport/parada
  }, [state, tiempos, parada, viewportH, maxPeekH]);

  // Altura del expandido (casi full)
  const expandedH = Math.round(viewportH * 0.92);

  // Y (desde ARRIBA) para cada estado, dejando el sheet por encima de la barra inferior
  const yPeek = React.useMemo(() => viewportH - peekAutoH - navH, [viewportH, peekAutoH, navH]);
  const yExpanded = React.useMemo(() => viewportH - expandedH - navH, [viewportH, expandedH, navH]);

  const targetY = React.useMemo(() => {
    if (state === 'closed')   return viewportH;  // fuera por abajo
    if (state === 'peek')     return yPeek;
    if (state === 'expanded') return yExpanded;
    return viewportH;
  }, [state, viewportH, yPeek, yExpanded]);

  // Gestos (expanded -> peek al bajar; peek -> closed al bajar fuerte)
  const onStart = (clientY) => {
    const d = drag.current;
    d.active = true; d.startY = clientY; d.lastY = clientY; d.lastT = now(); d.dy = 0; d.vy = 0;
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';
  };
  const onMove = (clientY) => {
    const d = drag.current;
    if (!d.active) return;
    const t = now();
    const dy = clientY - d.startY;
    const dt = Math.max(1, t - d.lastT);
    const vy = (clientY - d.lastY) / dt;
    d.dy = dy; d.vy = vy; d.lastY = clientY; d.lastT = t;

    const baseY = targetY;
    const nextY = clamp(baseY + dy, yExpanded, viewportH);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${nextY}px)`;
  };
  const onEnd = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    document.body.style.overscrollBehavior = '';
    document.body.style.touchAction = '';

    const dy = d.dy, vy = d.vy;
    const DOWN = dy > 0, UP = dy < 0;

    const TH_PEEK_FROM_EXPAND = 20;
    const TH_CLOSE_FROM_PEEK  = 80;
    const FLICK_UP   = -0.5;
    const FLICK_DOWN =  0.5;

    let next = state;

    if (UP || vy < FLICK_UP) {
      next = 'expanded';
    } else if (DOWN || vy > FLICK_DOWN) {
      if (state === 'expanded') {
        next = 'peek';
      } else if (state === 'peek') {
        next = (dy > TH_CLOSE_FROM_PEEK || vy > FLICK_DOWN) ? 'closed' : 'peek';
      } else {
        next = 'closed';
      }
    } else {
      if (state === 'expanded' && dy > TH_PEEK_FROM_EXPAND) next = 'peek';
      else if (state === 'peek' && dy > TH_CLOSE_FROM_PEEK) next = 'closed';
      else next = state;
    }

    onStateChange?.(next);
    if (sheetRef.current) sheetRef.current.style.transform = '';
  };

  const handleTouchStart = (e) => onStart(e.touches?.[0]?.clientY || 0);
  const handleTouchMove  = (e) => onMove(e.touches?.[0]?.clientY || 0);
  const handleTouchEnd   = () => onEnd();
  const handleMouseDown  = (e) => onStart(e.clientY);
  const handleMouseMove  = (e) => onMove(e.clientY);
  const handleMouseUp    = () => onEnd();

  // —— FIX: z-index dinámico y safe-area-top cuando está expanded —— 
  const isExpanded = state === 'expanded';
  const isPeek = state === 'peek';
  const containerZ = isExpanded ? 1300 : 1100; // TopBar ~1250
  const backdropZ  = isExpanded ? 1290 : 1050;

  const styleSheet = {
    top: 0,
    transform: `translateY(${targetY}px)`,
    willChange: 'transform',
    height: isExpanded ? `${expandedH}px` : `${peekAutoH}px`, // 👈 peek auto
    paddingTop: isExpanded ? 'max(0px, env(safe-area-inset-top))' : 0,
    zIndex: containerZ,
  };

  const miniCenter = parada ? [parada.lat, parada.lng] : null;

  // Mostrar solo 2 items en peek
  const visibleTiempos = Array.isArray(tiempos)
    ? (isExpanded ? tiempos : tiempos.slice(0, 2))
    : [];

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40"
          style={{ zIndex: backdropZ }}
          onClick={() => onStateChange?.('peek')}
          aria-hidden="true"
        />
      )}

      <div
        ref={sheetRef}
        className="fixed inset-x-0 bg-white text-gray-900 shadow-2xl border-t border-gray-200
                   transition-transform duration-200 select-none"
        style={styleSheet}
        role="dialog"
        aria-modal="true"
        aria-label="Tiempos de paso"
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown} onMouseMove={drag.current.active ? handleMouseMove : undefined} onMouseUp={handleMouseUp}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 cursor-grab active:cursor-grabbing">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <div className="font-semibold text-gray-900">
              {parada ? `Parada ${parada.id}` : 'Tiempos de paso'}
            </div>
            <div className="text-sm text-gray-600">{parada?.nombre}</div>
          </div>
          <button
            className="text-gray-700 hover:text-gray-900 text-2xl leading-none px-2"
            onClick={() => onStateChange?.('closed')}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        {isExpanded ? (
          // -------- EXPANDIDO: todo igual que antes --------
          <div className="overflow-auto h-[calc(100%-56px-12px)] p-4 space-y-3">
            {/* Mapita real */}
            <div className="w-full h-40 rounded-lg border border-gray-200 overflow-hidden">
              {miniCenter ? (
                <MapContainer
                  center={miniCenter}
                  zoom={16}
                  className="h-full w-full pointer-events-none"
                  zoomControl={false}
                  dragging={false}
                  doubleClickZoom={false}
                  scrollWheelZoom={false}
                  touchZoom={false}
                  keyboard={false}
                  attributionControl={false}
                  preferCanvas
                >
                  <FitOnExpand center={miniCenter} zoom={17} active={isExpanded} />
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <CircleMarker
                    center={miniCenter}
                    radius={8}
                    pathOptions={{ color: '#FFA300', fillColor: '#FFA300', fillOpacity: 0.95 }}
                  />
                </MapContainer>
              ) : (
                <div className="h-full w-full grid place-items-center text-sm text-gray-600 bg-gray-100">
                  Selecciona una parada para centrar el mapa
                </div>
              )}
            </div>

            {cargando && <div className="text-gray-700">Cargando tiempos…</div>}
            {error && <div className="text-red-600 font-semibold">Error: {error}</div>}
            {!cargando && !error && (!tiempos || tiempos.length === 0) && (
              <div className="text-gray-700">No hay próximos servicios.</div>
            )}
            {!cargando && !error && tiempos && tiempos.length > 0 && (
              <ul className="space-y-2">
                {tiempos.map((t, i) => (
                  <li key={i} className="border border-gray-200 rounded-lg p-3 text-gray-900">
                    <div><strong>Línea {t.linea}</strong> <span>→ {t.destino}</span></div>
                    <div className="flex justify-between items-center mt-1 text-sm">
                      <span className="text-gray-700">Operador: {t.operador}</span>
                      <span className="px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100 font-medium">{t.minutos} min</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          // -------- PEEK: solo 2 próximos y altura auto --------
          <div className="p-4">
            {cargando && <div className="text-gray-700">Cargando tiempos…</div>}
            {error && <div className="text-red-600 font-semibold">Error: {error}</div>}
            {!cargando && !error && (!visibleTiempos || visibleTiempos.length === 0) && (
              <div className="text-gray-700">No hay próximos servicios.</div>
            )}
            {!cargando && !error && visibleTiempos && visibleTiempos.length > 0 && (
              <ul className="space-y-2">
                {visibleTiempos.map((t, i) => (
                  <li key={i} className="border border-gray-200 rounded-lg p-3 text-gray-900">
                    <div><strong>Línea {t.linea}</strong> <span>→ {t.destino}</span></div>
                    <div className="flex justify-between items-center mt-1 text-sm">
                      <span className="text-gray-700">Operador: {t.operador}</span>
                      <span className="px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100 font-medium">{t.minutos} min</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Botón para ver todos cuando hay más de 2 */}
            {!isExpanded && Array.isArray(tiempos) && tiempos.length > 2 && (
              <div className="mt-2">
                <button
                  className="text-xs text-[#FFA300] font-medium"
                  onClick={() => onStateChange?.('expanded')}
                >
                  Ver todos ({tiempos.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
