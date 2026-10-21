import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, ChevronDown, ChevronRight, FlaskConical } from 'lucide-react';
import { useSession } from '@/app/session/useSession';
import { roleModules } from '@/modules';
import type { Identity } from '@/services/identity.service';
import type { RoleModule, SessionUser } from '@/shared/types/navigation';
import { RolePeopleList } from '../components/RolePeopleList';
import './RoleSelectPage.css';

/**
 * Pantalla de inicio: con qué perfil se entra.
 * - Identidad real: la persona es la de la cuenta de Power Apps y solo ve sus propios roles.
 * - Simulación (solo `npm run dev`): cualquier rol y cualquier persona, para probar.
 */
export default function RoleSelectPage() {
  const { identity, signIn } = useSession();
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

        {identity.status === 'simulated' && <SimulatedRoles onEnter={enter} />}
        {identity.status === 'loading' && <p className="role-select__subtitle">Verificando su cuenta…</p>}
        {identity.status === 'error' && (
          <p className="role-people__message role-people__message--error">No se pudo verificar su cuenta. {identity.error.message}</p>
        )}
        {identity.status === 'ready' && <VerifiedRoles identity={identity.identity} onEnter={enter} />}
      </div>
    </div>
  );
}

interface RolesProps {
  onEnter: (module: RoleModule, user: SessionUser) => void;
}

/** Los roles que la persona tiene asignados en Dataverse. */
function VerifiedRoles({ identity, onEnter }: RolesProps & { identity: Identity }) {
  const { person } = identity;
  if (!person) {
    return (
      <p className="role-select__subtitle">
        La cuenta <strong>{identity.account}</strong> no está registrada en el programa de inducción. Pida a un
        Administrador que la registre.
      </p>
    );
  }

  const modules = roleModules.filter((m) => identity.roles.includes(m.dataverseRole));
  if (modules.length === 0) {
    return (
      <p className="role-select__subtitle">
        Hola, {person.fullName}. Su cuenta todavía no tiene un rol asignado. Pida a un Administrador que se lo asigne.
      </p>
    );
  }

  return (
    <>
      <p className="role-select__subtitle">Hola, {person.fullName}. Elija con qué perfil desea ingresar.</p>
      <ul className="role-select__list">
        {modules.map((module) => (
          <li key={module.role} className="role-select__item">
            <button type="button" className="role-select__option" onClick={() => onEnter(module, person)}>
              <strong>{module.label}</strong>
              <ChevronRight size={18} className="role-select__chevron" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Solo desarrollo: cualquier rol y cualquier persona con ese rol. */
function SimulatedRoles({ onEnter }: RolesProps) {
  const [openRole, setOpenRole] = useState<RoleModule['role'] | null>(null);

  return (
    <>
      <p className="role-select__warning">
        <FlaskConical size={16} />
        Modo de prueba (solo en desarrollo): puede ingresar como cualquier persona. En producción se usa su cuenta real.
      </p>
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
              {isOpen && <RolePeopleList module={module} onSelect={(user) => onEnter(module, user)} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
