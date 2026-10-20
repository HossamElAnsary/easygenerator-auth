import {
  apiErrorResponseSchema,
  userResponseSchema,
  type ApiErrorCode,
  type ApiErrorResponse,
  type SigninRequest,
  type SignupRequest,
} from '@easy-generator/contracts';

export type ErrorKind =
  | 'validation'
  | 'credentials'
  | 'unauthenticated'
  | 'conflict'
  | 'rate-limit'
  | 'unavailable'
  | 'request';
const unavailableMessage = 'The service is unavailable. Try again.';

// Never retain request arguments, raw responses, or native error causes here.
export class ApiError extends Error {
  readonly retryAt: number | undefined;
  constructor(
    readonly kind: ErrorKind,
    message = unavailableMessage,
    readonly code?: ApiErrorCode,
    readonly fields?: ApiErrorResponse['error']['fields'],
    readonly retryAfter?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.retryAt =
      kind === 'rate-limit'
        ? Date.now() + (retryAfter ?? 60) * 1000
        : undefined;
  }
}

function decodeError(response: Response, body: unknown): ApiError {
  const parsed = apiErrorResponseSchema.safeParse(body);
  if (!parsed.success) return new ApiError('unavailable');
  const { code, message, fields, requestId } = parsed.data.error;
  if (code === 'UNAUTHENTICATED' && response.status !== 401)
    return new ApiError('unavailable');
  const kinds: Partial<Record<ApiErrorCode, ErrorKind>> = {
    VALIDATION_ERROR: 'validation',
    INVALID_CREDENTIALS: 'credentials',
    UNAUTHENTICATED: 'unauthenticated',
    EMAIL_IN_USE: 'conflict',
    RATE_LIMITED: 'rate-limit',
    SERVICE_UNAVAILABLE: 'unavailable',
    INTERNAL_ERROR: 'unavailable',
  };
  const kind =
    response.status >= 500 ? 'unavailable' : (kinds[code] ?? 'request');
  const seconds = Number(response.headers.get('Retry-After'));
  const retryAfter =
    kind === 'rate-limit'
      ? Number.isFinite(seconds) && seconds > 0
        ? Math.ceil(seconds)
        : 60
      : undefined;
  return new ApiError(
    kind,
    kind === 'unavailable' ? unavailableMessage : message,
    code,
    kind === 'validation' ? fields : undefined,
    retryAfter,
    requestId,
  );
}

async function request(
  path: string,
  successStatus: number,
  body?: unknown,
  signal?: AbortSignal,
) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15_000);
  const combined = signal
    ? AbortSignal.any([signal, timeout.signal])
    : timeout.signal;
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      signal: combined,
      ...(body === undefined
        ? {}
        : {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Protection': '1',
            },
            body: JSON.stringify(body),
          }),
    });
    combined.throwIfAborted();
    if (response.status === 204 && successStatus === 204) return undefined;
    const data: unknown = await response.json();
    combined.throwIfAborted();
    if (!response.ok) throw decodeError(response, data);
    if (response.status !== successStatus) throw new ApiError('unavailable');
    const parsed = userResponseSchema.safeParse(data);
    if (!parsed.success) throw new ApiError('unavailable');
    return parsed.data.user;
  } catch (error) {
    // Cancellation belongs to Query, whereas timeout/network failure is unavailable.
    signal?.throwIfAborted();
    if (error instanceof ApiError) throw error;
    throw new ApiError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}

async function userRequest(
  path: string,
  status: number,
  body?: unknown,
  signal?: AbortSignal,
) {
  const user = await request(path, status, body, signal);
  if (!user) throw new ApiError('unavailable');
  return user;
}
export const authApi = {
  signup: (input: SignupRequest) => userRequest('signup', 201, input),
  signin: (input: SigninRequest) => userRequest('signin', 200, input),
  me: (signal?: AbortSignal) => userRequest('me', 200, undefined, signal),
  logout: async () => {
    await request('logout', 204, {});
  },
};
