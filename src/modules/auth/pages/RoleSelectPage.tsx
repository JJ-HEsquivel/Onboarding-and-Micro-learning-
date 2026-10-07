import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useSession } from '@/app/session/useSession';
import { roleModules } from '@/modules';
import type { RoleModule, SessionUser } from '@/shared/types/navigation';
import { RolePeopleList } from '../components/RolePeopleList';
import './RoleSelectPage.css';

/**
 * Selector de rol y persona, para practicar con los datos reales de Dataverse.
 * TODO: reemplazar por la detección automática del usuario autenticado (getContext()).
 */
export default function RoleSelectPage() {
  const [openRole, setOpenRole] = useState<RoleModule['role'] | null>(null);
  const { signIn } = useSession();
  const navigate = useNavigate();

  const enter = (module: RoleModule, user: SessionUser) => {
    signIn({ role: module.role, user });
    navigate(module.basePath);
  };

  return (
    <div className="role-select">
      <div className="role-select__card">
        <span className="sidebar__logo">
          <BookOpen size={18} />
        </span>
        <h1 className="role-select__title">Inducción &amp; micro aprendizaje</h1>
        <p className="role-select__subtitle">Seleccione el perfil y la persona con la que desea ingresar.</p>

        <ul className="role-select__list">
          {roleModules.map((module) => {
            const isOpen = openRole === module.role;
            return (
              <li key={module.role} className={`role-select__item${isOpen ? ' role-select__item--open' : ''}`}>
                <button
                  type="button"
                  className="role-select__option"
                  aria-expanded={isOpen}
                  onClick={() => setOpenRole(isOpen ? null : module.role)}
                >
                  <strong>{module.label}</strong>
                  <ChevronDown size={18} className="role-select__chevron" />
                </button>
                {isOpen && <RolePeopleList module={module} onSelect={(user) => enter(module, user)} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
