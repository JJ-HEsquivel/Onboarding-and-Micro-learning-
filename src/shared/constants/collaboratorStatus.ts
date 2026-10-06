import type { BadgeTone } from '@/shared/components/Badge';
import type { CollaboratorStatus } from '@/shared/types/onboarding';

/** Texto y color con el que se muestra cada estado de un colaborador. */
export const COLLABORATOR_STATUS: Record<CollaboratorStatus, { label: string; tone: BadgeTone }> = {
  pendingValidation: { label: 'Por validar', tone: 'warning' },
  notStarted: { label: 'Por iniciar', tone: 'neutral' },
  inProgress: { label: 'En curso', tone: 'info' },
  overdue: { label: 'Atrasado', tone: 'danger' },
  completed: { label: 'Completado', tone: 'success' },
};
