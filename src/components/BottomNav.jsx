import React from 'react';

// Iconos en SVG (JSX-friendly)
function IconHome({ active }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="lucide lucide-house" aria-hidden="true"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function IconBus({ active }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="lucide lucide-route" aria-hidden="true"
    >
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}
function IconPin({ active }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="lucide lucide-map-pin" aria-hidden="true"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconCog({ active }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="lucide lucide-cog" aria-hidden="true"
    >
      <path d="M11 10.27 7 3.34" />
      <path d="m11 13.73-4 6.93" />
      <path d="M12 22v-2" />
      <path d="M12 2v2" />
      <path d="M14 12h8" />
      <path d="m17 20.66-1-1.73" />
      <path d="m17 3.34-1 1.73" />
      <path d="M2 12h2" />
      <path d="m20.66 17-1.73-1" />
      <path d="m20.66 7-1.73 1" />
      <path d="m3.34 17 1.73-1" />
      <path d="m3.34 7 1.73 1" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

const items = [
  { key: 'home', label: 'Inicio', Icon: IconHome },
  { key: 'lines', label: 'Líneas', Icon: IconBus },
  { key: 'stops', label: 'Paradas', Icon: IconPin },
  { key: 'settings', label: 'Config.', Icon: IconCog },
];

export default function BottomNav({ value, onChange }) {
  const ref = React.useRef(null);

  // Medir altura real y exponerla como --nav-h
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    window.addEventListener('resize', set);
    window.addEventListener('orientationchange', set);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', set);
      window.removeEventListener('orientationchange', set);
    };
  }, []);

  return (
    <nav
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-[1200] bg-white/95 backdrop-blur border-t border-gray-200"
      role="tablist"
      aria-label="Navegación principal"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ key, label, Icon }) => {
          const active = value === key;
          return (
            <li key={key} className="flex">
              <button
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${key}`}
                onClick={() => onChange(key)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 focus:outline-none ${
                  active ? 'text-[#FFA300]' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon active={active} />
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
