import { useCallback } from 'react';
import { useCurrentUser } from '@/app/session/useSession';
import { useAsync } from '@/shared/hooks/useAsync';
import { loadMyInduction } from '@/services/myInduction.service';

/** Inducción de la persona con sesión iniciada (ruta, avance y estado). */
export function useMyInduction() {
  const user = useCurrentUser();
  const load = useCallback(() => loadMyInduction(user.id), [user.id]);
  return { user, ...useAsync(load) };
}
