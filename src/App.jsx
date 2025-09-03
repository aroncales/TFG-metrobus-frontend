import React from 'react';
import TopBar from './components/TopBar.jsx';
import BottomNav from './components/BottomNav.jsx';
import HomeMap from './screens/HomeMap.jsx';
import Lines from './screens/Lines.jsx';
import Stops from './screens/Stops.jsx';
import Incidents from './screens/Incidents.jsx';
import InfoModal from './components/InfoModal.jsx';

export default function App() {
  const [tab, setTabRaw] = React.useState('home');
  const [nonce, setNonce] = React.useState(0);          // fuerza remount por pestaña
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [stopsQuery, setStopsQuery] = React.useState('');

  function go(nextTab) {
    // Limpiar estados al cambiar de pestaña
    if (nextTab !== 'stops') setStopsQuery('');         // no conservar búsqueda de Paradas
    setTabRaw(nextTab);
    setNonce(n => n + 1);                               // remount de la vista
  }

  // Búsqueda desde la TopBar (Home) → ir a Paradas con query
  function handleSearchStops(q) {
    setStopsQuery(q || '');
    go('stops');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* TopBar SOLO en Inicio */}
      {tab === 'home' && (
        <TopBar
          key={`top-${nonce}`}
          logoSrc="/logo.png"
          onSearch={handleSearchStops}
          onInfoClick={() => setInfoOpen(true)}
        />
      )}

      {/* Contenido */}
      <main style={{ paddingTop: tab === 'home' ? 'var(--topbar-h,56px)' : '0px' }}>
        {tab === 'home' && (
          <section id="panel-home" role="tabpanel" aria-labelledby="tab-home">
            <HomeMap />
          </section>
        )}
        {tab === 'lines' && (
          <section id="panel-lines" role="tabpanel" aria-labelledby="tab-lines">
            <Lines />
          </section>
        )}
        {tab === 'stops' && (
          <section id="panel-stops" role="tabpanel" aria-labelledby="tab-stops">
            <Stops key={`stops-${nonce}`} initialQuery={stopsQuery} />
          </section>
        )}
        {tab === 'incidents' && (
          <section id="panel-incidents" role="tabpanel" aria-labelledby="tab-incidents">
            <Incidents />
          </section>
        )}
      </main>

      <BottomNav value={tab} onChange={go} />

      {/* Modal de información */}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
