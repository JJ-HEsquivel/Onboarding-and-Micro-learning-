import { StatCard } from '@/shared/components/StatCard';
import type { Collaborator, CollaboratorStatus } from '@/shared/types/onboarding';

interface CollaboratorStatsProps {
  collaborators: Collaborator[];
}

/** Fila de indicadores en la parte superior de la pantalla. */
export function CollaboratorStats({ collaborators }: CollaboratorStatsProps) {
  const countBy = (status: CollaboratorStatus) => collaborators.filter((c) => c.status === status).length;

  return (
    <div className="collaborators-stats">
      <StatCard label="Total registrados" value={collaborators.length} caption="Colaboradores en el programa de inducción" />
      <StatCard label="Completados" value={countBy('completed')} caption="Ruta de inducción cerrada" />
      <StatCard label="Atrasados" value={countBy('overdue')} caption="Fuera del plazo de su etapa" />
      <StatCard label="Por validar" value={countBy('pendingValidation')} caption="Esperan la validación de su manager" />
    </div>
  );
}
