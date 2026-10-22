import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from './AuthProvider';
import { SessionNotice } from './SessionNotice';
import { Alert, Heading, errorMessage, useRequestError } from '../ui/patterns';
import styles from '../App.module.css';

export function ApplicationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const request = useRequestError();
  if (auth.status === 'anonymous') return <Navigate to="/signin" replace />;
  if (auth.status !== 'authenticated') return <SessionNotice />;
  async function logout() {
    if (pending || request.blocked) return;
    setPending(true);
    request.clear();
    try {
      await auth.logout();
      void navigate('/signin', { replace: true });
    } catch (error) {
      request.fail(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Heading>Welcome to the application.</Heading>
      {request.error != null && <Alert>{errorMessage(request.error)}</Alert>}
      <button
        className={styles.primary}
        disabled={pending || request.blocked}
        onClick={() => void logout()}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  );
}
