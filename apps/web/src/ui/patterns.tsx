import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import { ApiError } from '../api/client';
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
      <button
        type="button"
        className={styles.secondary}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Hide password' : 'Show password'}
      </button>
    </div>
  );
}
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return 'The service is unavailable. Try again.';
  if (error.kind === 'rate-limit') {
    const seconds = error.retryAfter ?? 60;
    return `Too many requests. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
  }
  return error.message;
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}
export function useRequestError() {
  const [error, setError] = useState<unknown>(null);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const blocked = useWaitUntil(blockedUntil);
  return {
    error,
    blocked,
    clear: () => setError(null),
    fail: (failure: unknown) => {
      setError(failure);
      if (failure instanceof ApiError && failure.kind === 'rate-limit') {
        setBlockedUntil(Date.now() + (failure.retryAfter ?? 60) * 1000);
      }
    },
  };
}

// setTimeout fires at once for a longer delay, so longer waits take steps.
const MAX_TIMER_DELAY = 2 ** 31 - 1;

export function useWaitUntil(until: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!until) return;
    let timer: ReturnType<typeof setTimeout>;
    // Timers and Date.now() use different clocks, so a timer can fire just
    // before the deadline; re-arm until the deadline has really passed.
    const wake = () => {
      const remaining = until - Date.now();
      if (remaining > 0)
        timer = setTimeout(wake, Math.min(remaining, MAX_TIMER_DELAY));
      else setNow(Date.now());
    };
    timer = setTimeout(
      wake,
      Math.min(Math.max(0, until - Date.now()), MAX_TIMER_DELAY),
    );
    return () => clearTimeout(timer);
  }, [until]);
  return until > now;
}
