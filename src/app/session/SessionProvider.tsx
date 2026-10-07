import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SessionContext, type Session } from './SessionContext';

/**
 * Sesión SIMULADA para practicar: guarda con qué persona y rol se ingresó desde la
 * pantalla de inicio. Se conserva al recargar la página (sessionStorage).
 *
 * TODO: reemplazar por el usuario real de Power Apps (getContext() de
 * @microsoft/power-apps/app), buscándolo por correo en contact y leyendo sus roles.
 */
const STORAGE_KEY = 'onboarding.session';

function readStoredSession(): Session | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Session) : null;
  } catch {
    return null;
  }
}

function storeSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible: la sesión dura solo mientras la pestaña esté abierta.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const signIn = useCallback((next: Session) => {
    storeSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    storeSession(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
