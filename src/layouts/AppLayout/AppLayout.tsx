import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import type { RoleModule } from '@/shared/types/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

interface AppLayoutProps {
  module: RoleModule;
}

/** Estructura común de todas las pantallas: barra lateral del rol + barra superior + contenido. */
export function AppLayout({ module }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const { pathname } = useLocation();

  const currentItem = module.navigation
    .flatMap((section) => section.items)
    .find((item) => pathname === `${module.basePath}/${item.path}`);

  // En pantallas pequeñas el menú se cierra al elegir una opción.
  const closeOnMobile = () => {
    if (isMobile()) setSidebarOpen(false);
  };

  return (
    <div className={`app-layout${sidebarOpen ? '' : ' app-layout--collapsed'}`}>
      <Sidebar module={module} onNavigate={closeOnMobile} />
      <div className="app-layout__backdrop" onClick={() => setSidebarOpen(false)} />
      <div className="app-layout__main">
        <Topbar
          roleLabel={module.label}
          pageLabel={currentItem?.label ?? ''}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
