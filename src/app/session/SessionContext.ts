import { createContext } from 'react';
import type { Identity } from '@/services/identity.service';
import type { SessionUser, UserRole } from '@/shared/types/navigation';

export interface Session {
  role: UserRole;
  user: SessionUser;
}

/** Estado de la identidad real (en simulación no se usa). */
export type IdentityState =
  | { status: 'simulated' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; identity: Identity };

export interface SessionContextValue {
  session: Session | null;
  identity: IdentityState;
  /** Entra con un rol. Con identidad real, solo acepta a la propia persona y sus propios roles. */
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
