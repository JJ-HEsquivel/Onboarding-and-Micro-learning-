import { SearchX, Users } from 'lucide-react';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { CollaboratorStatusBadge } from '@/shared/components/CollaboratorStatusBadge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/dates';
import { getInitials } from '@/shared/lib/format';
import type { Collaborator } from '@/shared/types/onboarding';

interface CollaboratorsTableProps {
  collaborators: Collaborator[];
  loading: boolean;
  /** true si existen colaboradores aunque los filtros los oculten. */
  hasCollaborators: boolean;
  onRegister: () => void;
  onOpen: (collaborator: Collaborator) => void;
}

export function CollaboratorsTable({ collaborators, loading, hasCollaborators, onRegister, onOpen }: CollaboratorsTableProps) {
  if (loading) {
    return <p className="collaborators-table__loading">Cargando colaboradores…</p>;
  }

  if (!hasCollaborators) {
    return (
      <EmptyState
        icon={Users}
        title="Aún no hay colaboradores registrados"
        description="Registre al primer colaborador para iniciar su ruta de inducción."
        action={<Button onClick={onRegister}>Registrar colaborador</Button>}
      />
    );
  }

  if (collaborators.length === 0) {
    return <EmptyState icon={SearchX} title="Ningún colaborador coincide con los filtros" />;
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Área</th>
            <th>Cargo</th>
            <th>Manager</th>
            <th>Ingreso</th>
            <th>Documentos</th>
            <th>Promedio</th>
            <th>Pendientes</th>
            <th>Estado</th>
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {collaborators.map((c) => (
            <tr key={c.id} className="table__row--clickable" onClick={() => onOpen(c)}>
              <td>
                <div className="person-cell">
                  <Avatar initials={getInitials(c.fullName)} size="sm" />
                  <div>
                    <p className="person-cell__name">{c.fullName}</p>
                    <p className="person-cell__subtitle">{c.jobTitle}</p>
                  </div>
                </div>
              </td>
              <td>{c.areaName}</td>
              <td>{c.jobTitle || '—'}</td>
              <td>{c.managerName}</td>
              <td className="nowrap">{formatDate(c.hireDate)}</td>
              <td>
                {c.documentsApproved}/{c.documentsTotal}
              </td>
              <td>{c.averageScore === null ? '—' : `${c.averageScore}%`}</td>
              <td>{c.documentsTotal - c.documentsApproved}</td>
              <td>
                <CollaboratorStatusBadge status={c.status} />
              </td>
              <td>
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(c);
                  }}
                >
                  Ver ficha
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
