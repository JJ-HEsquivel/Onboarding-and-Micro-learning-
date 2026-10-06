import { NavLink } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Avatar } from '@/shared/components/Avatar';
import type { RoleModule } from '@/shared/types/navigation';

interface SidebarProps {
  module: RoleModule;
  onNavigate?: () => void;
}

export function Sidebar({ module, onNavigate }: SidebarProps) {
  const { basePath, navigation, user } = module;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">
          <BookOpen size={18} />
        </span>
        <div>
          <p className="sidebar__brand-name">Jalasoft</p>
          <p className="sidebar__brand-tagline">Inducción &amp; micro aprendizaje</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Navegación principal">
        {navigation.map((section) => (
          <div key={section.title} className="sidebar__section">
            <p className="sidebar__section-title">{section.title}</p>
            <ul>
              {section.items.map(({ path, label, icon: Icon, badge }) => (
                <li key={path}>
                  <NavLink
                    to={`${basePath}/${path}`}
                    onClick={onNavigate}
                    className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    <span className="sidebar__link-label">{label}</span>
                    {badge !== undefined && <span className="sidebar__badge">{badge}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar__user">
        <Avatar initials={user.initials} />
        <div>
          <p className="sidebar__user-name">{user.fullName}</p>
          <p className="sidebar__user-title">{user.jobTitle}</p>
        </div>
      </div>
    </aside>
  );
}
