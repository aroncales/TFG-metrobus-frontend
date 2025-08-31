import React from 'react';
import TopBar from './components/TopBar.jsx';
import BottomNav from './components/BottomNav.jsx';
import HomeMap from './screens/HomeMap.jsx';
import Lines from './screens/Lines.jsx';
import Stops from './screens/Stops.jsx';
import Incidents from './screens/Incidents.jsx';
import InfoModal from './components/InfoModal.jsx';

export default function App() {
  const [tab, setTab] = React.useState('home');
  const [infoOpen, setInfoOpen] = React.useState(false);

  const handleSearch = (q) => {
    console.log('Buscar:', q);
    // TODO: navegar/filtrar si quieres
  };

  return (
    <div className="min-h-screen bg-white">
      {/* TopBar SOLO en Inicio */}
      {tab === 'home' && (
        <TopBar
          logoSrc="/logo.png"      // o import desde src/assets
          onSearch={handleSearch}
          onInfoClick={() => setInfoOpen(true)}  //  abre modal de información
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
            <Stops />
          </section>
        )}
        {tab === 'incidents' && (
          <section id="panel-incidents" role="tabpanel" aria-labelledby="tab-incidents">
            <Incidents />
          </section>
        )}
      </main>

      <BottomNav value={tab} onChange={setTab} />

      {/* Modal de información */}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
