import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useSession } from '@/app/session/useSession';

interface TopbarProps {
  roleLabel: string;
  pageLabel: string;
  onToggleSidebar: () => void;
}

export function Topbar({ roleLabel, pageLabel, onToggleSidebar }: TopbarProps) {
  // Al cerrar sesión, AppLayout redirige solo al inicio.
  const { signOut } = useSession();

  return (
    <header className="topbar">
      <button type="button" className="icon-button" onClick={onToggleSidebar} aria-label="Mostrar u ocultar menú">
        <Menu size={20} />
      </button>

      <nav className="topbar__breadcrumb" aria-label="Ruta actual">
        <span>{roleLabel}</span>
        <span className="topbar__breadcrumb-sep">/</span>
        <strong>{pageLabel}</strong>
      </nav>

      <div className="topbar__actions">
        <label className="topbar__search">
          <Search size={16} />
          <input type="search" placeholder="Buscar colaborador, documento o curso" />
        </label>
        <button type="button" className="icon-button icon-button--dot" aria-label="Notificaciones">
          <Bell size={20} />
        </button>
        <button type="button" className="icon-button" aria-label="Cerrar sesión" onClick={signOut}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
