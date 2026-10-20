import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import type { SigninRequest, SignupRequest } from '@easy-generator/contracts';
import { ApiError, authApi } from '../api/client';
import { clearUserData, sessionKey, sessionOptions } from './session';

type AuthStatus = 'checking' | 'unavailable' | 'authenticated' | 'anonymous';

function useCoordinator() {
  const client = useQueryClient();
  const location = useLocation();
  const [actionStatus, setActionStatus] = useState<AuthStatus | null>(null);
  const busy = actionStatus !== null;
  const active = useRef(false);
  const [checkedLocation, setCheckedLocation] = useState<string>();
  const [expired, setExpired] = useState(false);
  const query = useQuery({
    ...sessionOptions(client),
    enabled: () => !active.current,
  });
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    retry: false,
    networkMode: 'always',
  });

  // Cache events record only the expiry notice, never a second copy of the user.
  useEffect(() => {
    let wasAuthenticated = Boolean(client.getQueryData(sessionKey));
    return client.getQueryCache().subscribe((event) => {
      if (
        event.query.queryKey[0] !== 'auth' ||
        event.type !== 'updated' ||
        event.action.type !== 'success'
      )
        return;
      const authenticated = Boolean(event.query.state.data);
      if (wasAuthenticated && !authenticated && !active.current)
        setExpired(true);
      wasAuthenticated = authenticated;
    });
  }, [client]);

  useLayoutEffect(() => {
    if (
      busy ||
      !['/', '/signup', '/signin', '/app'].includes(location.pathname)
    )
      return;
    let current = true;
    // fetchQuery shares the observer's pending work, including focus/reconnect.
    void client
      .fetchQuery(sessionOptions(client))
      .catch(() => undefined)
      .finally(() => {
        if (current) setCheckedLocation(location.key);
      });
    return () => {
      current = false;
    };
  }, [client, location.key, location.pathname, busy]);

  const verificationStatus: AuthStatus =
    query.isFetching || checkedLocation !== location.key
      ? 'checking'
      : query.isError
        ? 'unavailable'
        : query.data
          ? 'authenticated'
          : 'anonymous';

  async function exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (active.current)
      throw new ApiError('request', 'Please wait for the current request.');
    active.current = true;
    // Preserve the verified UI state, not merely the presence of cached data.
    setActionStatus(verificationStatus);
    await client.cancelQueries({ queryKey: sessionKey });
    try {
      return await action();
    } finally {
      active.current = false;
      setActionStatus(null);
    }
  }
  return {
    status: actionStatus ?? verificationStatus,
    hasResolved: query.data !== undefined,
    error: query.error,
    expired,
    actionPending: busy,
    retry: async () => {
      if (!active.current) await query.refetch({ cancelRefetch: false });
    },
    signup: (input: SignupRequest) => exclusive(() => authApi.signup(input)),
    signin: (input: SigninRequest) =>
      exclusive(async () => {
        const user = await authApi.signin(input);
        clearUserData(client);
        client.setQueryData(sessionKey, user);
        setExpired(false);
      }),
    logout: () =>
      exclusive(async () => {
        await logoutMutation.mutateAsync();
        clearUserData(client);
        client.setQueryData(sessionKey, null);
        setExpired(false);
      }),
  };
}
const AuthContext = createContext<ReturnType<typeof useCoordinator> | null>(
  null,
);
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useCoordinator();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is required.');
  return auth;
}
