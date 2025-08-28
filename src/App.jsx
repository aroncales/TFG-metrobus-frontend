import React from 'react';
import TopBar from './components/TopBar.jsx';
import BottomNav from './components/BottomNav.jsx';
import HomeMap from './screens/HomeMap.jsx';
import Lines from './screens/Lines.jsx';
import Stops from './screens/Stops.jsx';
import Settings from './screens/Settings.jsx';

export default function App() {
  const [tab, setTab] = React.useState('home');
  const [unread, setUnread] = React.useState(2); // demo

  const handleSearch = (q) => {
    console.log('Buscar:', q);
    // TODO: navegar/filtrar
  };
  const openWarnings = () => {
    console.log('Abrir avisos');
    // TODO: modal o pantalla de avisos
  };

  const topPad = tab === 'home' ? 'var(--topbar-h,56px)' : '0px';

  return (
    <div className="min-h-screen bg-white">
      {tab === 'home' && (
        <TopBar
          logoSrc="/logo.png"         // o import desde src/assets
          onSearch={handleSearch}
          onWarnClick={openWarnings}
          unreadCount={unread}
        />
      )}

      <main style={{ paddingTop: topPad }}>
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
        {tab === 'settings' && (
          <section id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
            <Settings />
          </section>
        )}
      </main>

      <BottomNav value={tab} onChange={setTab} />
    </div>
  );
}
