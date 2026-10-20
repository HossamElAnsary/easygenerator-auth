import { QueryClient, queryOptions } from '@tanstack/react-query';
import { ApiError, authApi } from '../api/client';

export const sessionKey = ['auth', 'me'] as const;
export function createQueryClient() {
  return new QueryClient();
}
export function clearUserData(client: QueryClient) {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
}
export function sessionOptions(client: QueryClient) {
  return queryOptions({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      try {
        return await authApi.me(signal);
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof ApiError && error.kind === 'unauthenticated') {
          clearUserData(client);
          return null;
        }
        throw error;
      }
    },
    staleTime: 0,
    retry: false,
    networkMode: 'always',
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}
