import { StatCard } from '@/shared/components/StatCard';
import { pluralize } from '@/shared/lib/format';
import type { Collaborator, CollaboratorStatus } from '@/shared/types/onboarding';

interface CollaboratorStatsProps {
  collaborators: Collaborator[];
}

/** Promedio de días de cierre de las inducciones completadas, o null si no hay ninguna. */
function averageClosingDays(collaborators: Collaborator[]): number | null {
  const days = collaborators.flatMap((c) => (c.closingDays === null ? [] : [c.closingDays]));
  if (days.length === 0) return null;
  return Math.round(days.reduce((sum, value) => sum + value, 0) / days.length);
}

/** Fila de indicadores en la parte superior de la pantalla. */
export function CollaboratorStats({ collaborators }: CollaboratorStatsProps) {
  const countBy = (status: CollaboratorStatus) => collaborators.filter((c) => c.status === status).length;
  const closingDays = averageClosingDays(collaborators);

  return (
    <div className="collaborators-stats">
      <StatCard
        label="Total registrados"
        value={collaborators.length}
        caption={`${pluralize(countBy('pendingValidation'), 'pendiente', 'pendientes')} de validación`}
      />
      <StatCard label="Completados" value={countBy('completed')} caption="Ruta de inducción cerrada" />
      <StatCard label="Atrasados" value={countBy('overdue')} caption="Fuera del plazo de su etapa" />
      <StatCard
        label="Tiempo medio de cierre"
        value={closingDays === null ? '—' : `${closingDays} d`}
        caption={closingDays === null ? 'Aún no hay inducciones cerradas' : 'Desde el inicio hasta el cierre'}
      />
    </div>
  );
}
