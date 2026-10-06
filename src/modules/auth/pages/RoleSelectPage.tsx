import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { roleModules } from '@/modules';
import { Avatar } from '@/shared/components/Avatar';
import './RoleSelectPage.css';

/**
 * Selector de rol para desarrollo.
 * TODO: reemplazar por la detección automática del rol del usuario autenticado (Dataverse).
 */
export default function RoleSelectPage() {
  return (
    <div className="role-select">
      <div className="role-select__card">
        <span className="sidebar__logo">
          <BookOpen size={18} />
        </span>
        <h1 className="role-select__title">Inducción &amp; micro aprendizaje</h1>
        <p className="role-select__subtitle">Seleccione el perfil con el que desea ingresar.</p>

        <ul className="role-select__list">
          {roleModules.map((module) => (
            <li key={module.role}>
              <Link to={module.basePath} className="role-select__option">
                <Avatar initials={module.user.initials} />
                <span>
                  <strong>{module.label}</strong>
                  <small>
                    {module.user.fullName} · {module.user.jobTitle}
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
