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
}

export function CollaboratorsTable({ collaborators, loading, hasCollaborators, onRegister }: CollaboratorsTableProps) {
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
            <tr key={c.id}>
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
                {c.documentsRead}/{c.documentsTotal}
              </td>
              {/* TODO: promedio de comprensión cuando existan intentos de evaluación (jsi_assessmentattempt). */}
              <td>—</td>
              <td>{c.documentsTotal - c.documentsRead}</td>
              <td>
                <CollaboratorStatusBadge status={c.status} />
              </td>
              <td>
                {/* TODO: abrir la ficha del colaborador. */}
                <Button variant="secondary" disabled title="Disponible próximamente">
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
