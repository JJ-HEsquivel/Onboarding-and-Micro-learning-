import { createContext } from 'react';
import type { SessionUser, UserRole } from '@/shared/types/navigation';

/** Con qué rol y con qué persona se ingresó. */
export interface Session {
  role: UserRole;
  user: SessionUser;
}

/** Lo que cualquier pantalla puede leer o hacer con la sesión. */
export interface SessionContextValue {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
