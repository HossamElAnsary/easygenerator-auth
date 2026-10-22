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
// The API always sends Retry-After; this covers a missing or unusable header.
const DEFAULT_RETRY_AFTER_SECONDS = 60;

const kinds: Partial<Record<ApiErrorCode, ErrorKind>> = {
  VALIDATION_ERROR: 'validation',
  INVALID_CREDENTIALS: 'credentials',
  UNAUTHENTICATED: 'unauthenticated',
  EMAIL_IN_USE: 'conflict',
  RATE_LIMITED: 'rate-limit',
  SERVICE_UNAVAILABLE: 'unavailable',
  INTERNAL_ERROR: 'unavailable',
};

// Never retain request arguments, raw responses, or native error causes here.
export class ApiError extends Error {
  readonly code: ApiErrorCode | undefined;
  readonly fields: ApiErrorResponse['error']['fields'];
  readonly requestId: string | undefined;
  // Both are set exactly when kind is 'rate-limit': the wait the server asked
  // for, in whole seconds, and the time it ends.
  readonly retryAfter: number | undefined;
  readonly retryAt: number | undefined;
  constructor(
    readonly kind: ErrorKind,
    options: {
      message?: string;
      code?: ApiErrorCode;
      fields?: ApiErrorResponse['error']['fields'];
      retryAfter?: number;
      requestId?: string;
    } = {},
  ) {
    super(options.message ?? unavailableMessage);
    this.name = 'ApiError';
    this.code = options.code;
    this.fields = options.fields;
    this.requestId = options.requestId;
    this.retryAfter =
      kind === 'rate-limit'
        ? (options.retryAfter ?? DEFAULT_RETRY_AFTER_SECONDS)
        : undefined;
    this.retryAt =
      this.retryAfter === undefined
        ? undefined
        : Date.now() + this.retryAfter * 1000;
  }
}

function decodeError(response: Response, body: unknown): ApiError {
  const parsed = apiErrorResponseSchema.safeParse(body);
  if (!parsed.success) return new ApiError('unavailable');
  const { code, message, fields, requestId } = parsed.data.error;
  if (code === 'UNAUTHENTICATED' && response.status !== 401)
    return new ApiError('unavailable');
  const kind =
    response.status >= 500 ? 'unavailable' : (kinds[code] ?? 'request');
  const seconds = Number(response.headers.get('Retry-After'));
  return new ApiError(kind, {
    ...(kind === 'unavailable' ? {} : { message }),
    code,
    ...(kind === 'validation' ? { fields } : {}),
    ...(Number.isFinite(seconds) && seconds > 0
      ? { retryAfter: Math.ceil(seconds) }
      : {}),
    requestId,
  });
}

async function request(
  path: string,
  {
    method,
    successStatus,
    body,
    signal,
  }: {
    method: 'GET' | 'POST';
    successStatus: number;
    body?: unknown;
    signal?: AbortSignal | undefined;
  },
) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15_000);
  const combined = signal
    ? AbortSignal.any([signal, timeout.signal])
    : timeout.signal;
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method,
      credentials: 'same-origin',
      signal: combined,
      ...(method === 'GET'
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

async function userRequest(...args: Parameters<typeof request>) {
  const user = await request(...args);
  if (!user) throw new ApiError('unavailable');
  return user;
}
export const authApi = {
  signup: (input: SignupRequest) =>
    userRequest('signup', { method: 'POST', successStatus: 201, body: input }),
  signin: (input: SigninRequest) =>
    userRequest('signin', { method: 'POST', successStatus: 200, body: input }),
  me: (signal?: AbortSignal) =>
    userRequest('me', { method: 'GET', successStatus: 200, signal }),
  logout: async () => {
    // The logout schema is an empty object, so the request still has a body.
    await request('logout', { method: 'POST', successStatus: 204, body: {} });
  },
};
