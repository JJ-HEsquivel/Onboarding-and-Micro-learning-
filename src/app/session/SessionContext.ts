import { createContext } from 'react';
import type { SessionUser, UserRole } from '@/shared/types/navigation';

export interface Session {
  role: UserRole;
  user: SessionUser;
}

export interface SessionContextValue {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
