import { Avatar } from '@/shared/components/Avatar';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { formatDate } from '@/shared/lib/dates';
import { getInitials } from '@/shared/lib/format';
import type { ManagerSummary } from '@/services/promotion.service';

interface ManagersTableProps {
  managers: ManagerSummary[];
  onTransfer: (manager: ManagerSummary) => void;
  onRevert: (manager: ManagerSummary) => void;
}

export function ManagersTable({ managers, onTransfer, onRevert }: ManagersTableProps) {
  if (managers.length === 0) return <p className="managers-page__empty">Todavía no hay managers.</p>;

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Manager</th>
            <th>Área</th>
            <th>Origen</th>
            <th>Equipo</th>
            <th>En curso</th>
            <th>Atrasados</th>
            <th>Por validar</th>
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {managers.map((m) => (
            <tr key={m.id}>
              <td>
                <div className="person-cell">
                  <Avatar initials={getInitials(m.fullName)} size="sm" />
                  <div>
                    <p className="person-cell__name">{m.fullName}</p>
                    <p className="person-cell__subtitle">{m.jobTitle}</p>
                  </div>
                </div>
              </td>
              <td>{m.areaName}</td>
              <td>
                {m.origin === 'promotion' ? (
                  <Badge tone="info">Ascendido · {formatDate(m.promotedOn)}</Badge>
                ) : (
                  <Badge>Cuenta base</Badge>
                )}
              </td>
              <td>{m.team.total}</td>
              <td>{m.team.inProgress}</td>
              <td>{m.team.overdue}</td>
              <td>{m.team.pendingValidation}</td>
              <td>
                <div className="managers-page__actions">
                  <Button variant="secondary" disabled={m.team.total === 0} onClick={() => onTransfer(m)}>
                    Transferir equipo
                  </Button>
                  {m.origin === 'promotion' && (
                    <Button
                      variant="secondary"
                      disabled={m.team.total > 0}
                      title={m.team.total > 0 ? 'Primero transfiera su equipo' : undefined}
                      onClick={() => onRevert(m)}
                    >
                      Revertir ascenso
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
