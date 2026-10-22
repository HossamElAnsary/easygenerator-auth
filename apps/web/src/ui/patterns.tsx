import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import styles from '../App.module.css';

export function Heading({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => {
    heading.current?.focus();
  }, [location.key]);
  return (
    <h1 ref={heading} tabIndex={-1}>
      {children}
    </h1>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={props.id}>{label}</label>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hint ? `${props.id}-hint` : '', error ? `${props.id}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
      />
      {hint && (
        <div id={`${props.id}-hint`} className={styles.hint}>
          {hint}
        </div>
      )}
      {error && (
        <p id={`${props.id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
export function PasswordField({
  signup,
  ...props
}: Omit<Parameters<typeof Field>[0], 'label' | 'type'> & { signup: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Field
        {...props}
        label="Password"
        type={visible ? 'text' : 'password'}
        autoComplete={signup ? 'new-password' : 'current-password'}
        hint={
          signup ? (
            <>
              <span>Use 8–128 characters, including:</span>
              <ul>
                <li>At least one letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </>
          ) : undefined
        }
      />
      {/* The label names the action, so it carries no aria-pressed state. */}
      <button
        type="button"
        className={styles.secondary}
        aria-controls={props.id}
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Hide password' : 'Show password'}
      </button>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}
// A status region inserted with its text is announced unreliably; an alert is
// announced on insertion. Use it for the result of a user's own request.
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="alert">
      {children}
    </p>
  );
}
