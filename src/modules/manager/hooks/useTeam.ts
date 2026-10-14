import { useCallback } from 'react';
import { useCurrentUser } from '@/app/session/useSession';
import { useAsync } from '@/shared/hooks/useAsync';
import { loadCollaboratorsOverview } from '@/services/collaborators.service';

/** Equipo del Manager con sesión iniciada (sus colaboradores con su avance). */
export function useTeam() {
  const manager = useCurrentUser();
  const load = useCallback(() => loadCollaboratorsOverview(manager.id), [manager.id]);
  return { manager, ...useAsync(load) };
}
