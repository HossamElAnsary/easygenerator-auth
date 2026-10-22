import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return 'The service is unavailable. Try again.';
  if (error.retryAfter !== undefined) {
    const seconds = error.retryAfter;
    return `Too many requests. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
  }
  return error.message;
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
      if (failure instanceof ApiError && failure.retryAt !== undefined) {
        setBlockedUntil(failure.retryAt);
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
