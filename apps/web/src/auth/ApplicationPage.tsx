import { useNavigate } from 'react-router';
import { useAuth } from './AuthProvider';
import { RequireSession } from './guards';
import { Alert, Heading } from '../ui/patterns';
import { errorMessage, useRequestError } from './request-error';
import styles from '../App.module.css';

export function ApplicationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  // Held above the guard: the session check after a failed logout unmounts
  // the guarded content, and the failure must still show once it returns.
  const request = useRequestError();
  async function logout() {
    if (auth.actionPending || request.blocked) return;
    request.clear();
    try {
      await auth.logout();
      void navigate('/signin', { replace: true });
    } catch (error) {
      request.fail(error);
    }
  }
  return (
    <RequireSession>
      <Heading>Welcome to the application.</Heading>
      {request.error != null && <Alert>{errorMessage(request.error)}</Alert>}
      <button
        className={styles.primary}
        disabled={auth.actionPending || request.blocked}
        onClick={() => void logout()}
      >
        {auth.actionPending ? 'Signing out…' : 'Sign out'}
      </button>
    </RequireSession>
  );
}
