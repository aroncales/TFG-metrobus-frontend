import React from 'react';

function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconWarn(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path d="M12.9 2.9a1 1 0 0 0-1.8 0L2.3 19.1A1 1 0 0 0 3.2 20.6h17.6a1 1 0 0 0 .9-1.5L12.9 2.9Z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17.5" r="1.2" fill="currentColor"/>
    </svg>
  );
}

export default function TopBar({
  logoSrc,
  onLogoClick,
  onSearch,
  onWarnClick,
  unreadCount = 0,
  placeholder = 'Buscar líneas o paradas…',
}) {
  const ref = React.useRef(null);
  const [q, setQ] = React.useState('');

  // Medimos la altura real de la barra y la exponemos como --topbar-h
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setH = () => {
      document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    };
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    window.addEventListener('resize', setH);
    window.addEventListener('orientationchange', setH);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setH);
      window.removeEventListener('orientationchange', setH);
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    onSearch?.(v);
  };

  return (
    <header
      ref={ref}
      className="fixed inset-x-0 top-0 z-[1250] bg-white/95 backdrop-blur border-b border-gray-200"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
      role="banner"
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        {/* Logo / botón izquierda */}
        <button
          onClick={onLogoClick}
          aria-label="Inicio"
          className="shrink-0 w-9 h-9 rounded-md overflow-hidden grid place-items-center border border-gray-200 bg-white"
        >
          {logoSrc ? (
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="w-6 h-6 rounded bg-[#FFA300]" />
          )}
        </button>

        {/* Buscador centro */}
        <form onSubmit={submit} className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <IconSearch />
          </span>
          <input
            type="search"
            inputMode="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label="Buscar"
            className="w-full rounded-full border border-gray-300 bg-gray-100 pl-9 pr-9 py-2 text-sm
                       placeholder-gray-500 focus:outline-none focus:border-[#FFA300] focus:ring-2 focus:ring-[#FFA300]/30"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              ×
            </button>
          )}
        </form>

        {/* Avisos derecha */}
        <button
          onClick={onWarnClick}
          aria-label="Abrir avisos"
          className="relative shrink-0 w-9 h-9 grid place-items-center rounded-md border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
        >
          <IconWarn />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} avisos sin leer`}
              className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#FFA300] text-white text-[10px] leading-4 text-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
