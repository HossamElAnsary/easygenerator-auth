import type { ReactNode } from 'react';
import { Alert, Heading, Notice } from '../ui/patterns';
import { useAuth } from './AuthProvider';
import { errorMessage } from './request-error';
import { SessionNotice } from './SessionNotice';
import type { AuthFormState } from './use-auth-form';
import styles from '../App.module.css';

// The layout both auth forms share; each form supplies its own fields.
export function AuthFormFrame({
  title,
  description,
  pendingLabel,
  notice,
  footer,
  form: { isSubmitting, request, submit },
  children,
}: {
  title: string;
  description: string;
  pendingLabel: string;
  notice?: ReactNode;
  footer: ReactNode;
  form: AuthFormState;
  children: ReactNode;
}) {
  const auth = useAuth();
  return (
    <>
      <Heading>{title}</Heading>
      <p className={styles.description}>{description}</p>
      <SessionNotice />
      {notice}
      {auth.expired && (
        <Notice>Your session has expired. Please sign in again.</Notice>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          if (isSubmitting) {
            event.preventDefault();
            return;
          }
          void submit(event);
        }}
        aria-busy={isSubmitting}
        onChange={request.clear}
      >
        {children}
        {request.error != null && <Alert>{errorMessage(request.error)}</Alert>}
        <button
          className={styles.primary}
          type="submit"
          disabled={isSubmitting || request.blocked}
        >
          {isSubmitting ? pendingLabel : title}
        </button>
      </form>
      <p className={styles.footer}>{footer}</p>
    </>
  );
}
