import { useCallback } from 'react';
import { Avatar } from '@/shared/components/Avatar';
import { useAsync } from '@/shared/hooks/useAsync';
import { getInitials } from '@/shared/lib/format';
import type { RoleModule, SessionUser } from '@/shared/types/navigation';
import { listPeopleWithRole } from '@/services/people.service';

interface RolePeopleListProps {
  module: RoleModule;
  onSelect: (user: SessionUser) => void;
}

/** Personas que tienen el rol en Dataverse; al elegir una se ingresa como ella. */
export function RolePeopleList({ module, onSelect }: RolePeopleListProps) {
  const loadPeople = useCallback(() => listPeopleWithRole(module.dataverseRole), [module.dataverseRole]);
  const { data: people, error, loading } = useAsync(loadPeople);

  if (loading) return <p className="role-people__message">Cargando personas…</p>;
  if (error) return <p className="role-people__message role-people__message--error">{error.message}</p>;
  if (!people || people.length === 0) {
    return (
      <p className="role-people__message">
        No hay personas con el rol {module.label}. Asígnelo en la tabla Role Assignment.
      </p>
    );
  }

  return (
    <ul className="role-people">
      {people.map((person) => (
        <li key={person.id}>
          <button type="button" className="role-people__person" onClick={() => onSelect(person)}>
            <Avatar initials={getInitials(person.fullName)} size="sm" />
            <span>
              <strong>{person.fullName}</strong>
              {person.jobTitle && <small>{person.jobTitle}</small>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
