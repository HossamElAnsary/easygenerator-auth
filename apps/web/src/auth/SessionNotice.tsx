import { useAuth } from './AuthProvider';
import { ApiError } from '../api/client';
import { errorMessage, Notice, useWaitUntil } from '../ui/patterns';

export function SessionNotice() {
  const auth = useAuth();
  const blocked = useWaitUntil(
    auth.error instanceof ApiError ? (auth.error.retryAt ?? 0) : 0,
  );
  if (auth.status === 'checking')
    return <Notice>Checking your session…</Notice>;
  if (auth.status !== 'unavailable') return null;
  return (
    <div>
      <Notice>
        {auth.error instanceof ApiError && auth.error.kind === 'rate-limit'
          ? errorMessage(auth.error)
          : "We couldn't check your session. Try again."}
      </Notice>
      <button
        disabled={blocked || auth.actionPending}
        type="button"
        onClick={() => void auth.retry()}
      >
        Retry
      </button>
    </div>
  );
}
