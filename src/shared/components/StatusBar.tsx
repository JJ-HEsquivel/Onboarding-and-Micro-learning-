import { COLLABORATOR_STATUS } from '@/shared/constants/collaboratorStatus';
import type { CollaboratorStatus } from '@/shared/types/onboarding';

/** Orden fijo de los estados: del mejor al que requiere acción. El color sigue al estado, nunca al orden. */
const STATUS_ORDER: CollaboratorStatus[] = ['completed', 'inProgress', 'notStarted', 'pendingValidation', 'overdue'];

interface StatusBarProps {
  statuses: CollaboratorStatus[];
}

/**
 * Distribución de colaboradores por estado (parte de un todo): una barra apilada horizontal
 * y una leyenda con la cantidad de cada estado, que también sirve de tabla de datos.
 */
export function StatusBar({ statuses }: StatusBarProps) {
  const total = statuses.length;
  const counts = STATUS_ORDER.map((status) => ({ status, count: statuses.filter((s) => s === status).length }));

  if (total === 0) return <p className="status-bar__empty">Todavía no hay colaboradores registrados.</p>;

  return (
    <figure className="status-bar">
      <div className="status-bar__track" role="img" aria-label={counts.map((c) => `${COLLABORATOR_STATUS[c.status].label}: ${c.count}`).join(', ')}>
        {counts
          .filter((c) => c.count > 0)
          .map(({ status, count }) => (
            <span
              key={status}
              className={`status-bar__segment status-bar__segment--${COLLABORATOR_STATUS[status].tone}`}
              style={{ flexGrow: count }}
              title={`${COLLABORATOR_STATUS[status].label}: ${count} (${Math.round((count / total) * 100)}%)`}
            />
          ))}
      </div>
      <figcaption>
        <ul className="status-bar__legend">
          {counts.map(({ status, count }) => (
            <li key={status}>
              <span className={`status-bar__swatch status-bar__segment--${COLLABORATOR_STATUS[status].tone}`} aria-hidden="true" />
              <span className="status-bar__label">{COLLABORATOR_STATUS[status].label}</span>
              <strong>{count}</strong>
              <span className="status-bar__percent">{Math.round((count / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
