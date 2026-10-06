import { COLLABORATOR_STATUS } from '@/shared/constants/collaboratorStatus';
import type { CollaboratorStatus } from '@/shared/types/onboarding';
import { Badge } from './Badge';

export function CollaboratorStatusBadge({ status }: { status: CollaboratorStatus }) {
  const { label, tone } = COLLABORATOR_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
