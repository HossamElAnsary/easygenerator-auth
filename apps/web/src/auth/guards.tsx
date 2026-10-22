import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './AuthProvider';
import { SessionNotice } from './SessionNotice';

// Guards choose what a route shows from the derived session state. They are
// usability measures; the API's session guard is the security boundary.

export function Home() {
  const auth = useAuth();
  if (auth.status === 'authenticated') return <Navigate to="/app" replace />;
  if (auth.status === 'anonymous') return <Navigate to="/signin" replace />;
  return <SessionNotice />;
}

// Once the session has had an answer, later checks keep the form mounted, so
// its entries survive; the form shows their notice itself.
export function PublicOnly({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.status === 'authenticated') return <Navigate to="/app" replace />;
  if (!auth.hasVerifiedOnce) return <SessionNotice />;
  return children;
}

// Protected content is withheld during every check. A page keeps its own
// state above this guard, because each auth action is followed by a check.
export function RequireSession({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.status === 'anonymous') return <Navigate to="/signin" replace />;
  if (auth.status !== 'authenticated') return <SessionNotice />;
  return children;
}
