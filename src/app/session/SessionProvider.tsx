import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { roleModules } from '@/modules';
import { useAsync } from '@/shared/hooks/useAsync';
import type { UserRole } from '@/shared/types/navigation';
import { loadIdentity } from '@/services/identity.service';
import { ROLE_SIMULATION } from './authMode';
import { SessionContext, type IdentityState, type Session, type SessionContextValue } from './SessionContext';

/**
 * La sesión: con qué rol (y, en simulación, con qué persona) se está usando la app.
 * Ver authMode.ts para la diferencia entre identidad real y simulación.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return ROLE_SIMULATION ? <SimulatedSessionProvider>{children}</SimulatedSessionProvider> : <VerifiedSessionProvider>{children}</VerifiedSessionProvider>;
}

const STORAGE_KEY = 'onboarding.session';

/** sessionStorage puede no estar disponible (modo privado, políticas del navegador). */
function readStored<T>(): T | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(value: unknown): void {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: la sesión dura mientras la pestaña siga abierta.
  }
}

/** Solo desarrollo: se elige cualquier rol y persona. Se recuerda al recargar la página. */
function SimulatedSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readStored<Session>());

  const signIn = useCallback((next: Session) => {
    writeStored(next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    writeStored(null);
    setSession(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ session, identity: { status: 'simulated' }, signIn, signOut }),
    [session, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Identidad real: la persona es SIEMPRE la de la cuenta con la que se abrió Power Apps.
 * Del navegador solo se recuerda el rol elegido, y se vuelve a comprobar contra los roles
 * reales en cada carga: editar el sessionStorage no permite entrar con un rol ajeno.
 */
function VerifiedSessionProvider({ children }: { children: ReactNode }) {
  const identityLoad = useAsync(loadIdentity);
  const [chosenRole, setChosenRole] = useState<UserRole | null>(() => readStored<{ role: UserRole }>()?.role ?? null);

  const data = identityLoad.data;
  const loadError = identityLoad.error;
  const identity = useMemo<IdentityState>(
    () => (data ? { status: 'ready', identity: data } : loadError ? { status: 'error', error: loadError } : { status: 'loading' }),
    [data, loadError],
  );

  const holdsRole = useCallback(
    (role: UserRole) => {
      const module = roleModules.find((m) => m.role === role);
      return Boolean(data?.person && module && data.roles.includes(module.dataverseRole));
    },
    [data],
  );

  const session = useMemo<Session | null>(
    () => (data?.person && chosenRole && holdsRole(chosenRole) ? { role: chosenRole, user: data.person } : null),
    [data, chosenRole, holdsRole],
  );

  const signIn = useCallback(
    (next: Session) => {
      if (!data?.person || next.user.id !== data.person.id || !holdsRole(next.role)) {
        throw new Error('Su cuenta no tiene ese rol asignado.');
      }
      writeStored({ role: next.role });
      setChosenRole(next.role);
    },
    [data, holdsRole],
  );

  // Vuelve a la elección de rol. Cerrar la cuenta de Microsoft se hace desde Power Apps.
  const signOut = useCallback(() => {
    writeStored(null);
    setChosenRole(null);
  }, []);

  const value = useMemo<SessionContextValue>(() => ({ session, identity, signIn, signOut }), [session, identity, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
