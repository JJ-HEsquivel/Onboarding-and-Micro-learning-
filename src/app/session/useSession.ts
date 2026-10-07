import { useContext } from 'react';
import { SessionContext, type SessionContextValue } from './SessionContext';

/** Acceso a la sesión actual desde cualquier componente. */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  return context;
}

/**
 * Usuario de la sesión, para pantallas que solo se muestran con sesión iniciada
 * (AppLayout redirige al inicio si no la hay).
 */
export function useCurrentUser() {
  const { session } = useSession();
  if (!session) throw new Error('No hay una sesión iniciada.');
  return session.user;
}
