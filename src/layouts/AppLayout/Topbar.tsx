import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router';

interface TopbarProps {
  roleLabel: string;
  pageLabel: string;
  onToggleSidebar: () => void;
}

export function Topbar({ roleLabel, pageLabel, onToggleSidebar }: TopbarProps) {
  const navigate = useNavigate();

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
        {/* TODO: cerrar sesión real; por ahora vuelve al selector de rol. */}
        <button type="button" className="icon-button" aria-label="Cerrar sesión" onClick={() => navigate('/')}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
