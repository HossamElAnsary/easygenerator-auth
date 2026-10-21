import { randomUUID } from 'node:crypto';
import type { ApiErrorCode, PublicUser } from '@easy-generator/contracts';
import type { Request, RequestHandler } from 'express';
import type { AppLogger } from '../infrastructure/logging/app-logger.js';
import { isApiPath } from './api-paths.js';

interface RequestState {
  readonly requestId: string;
  errorCode?: ApiErrorCode;
  user?: PublicUser;
}

// Keyed by the request object, so state cannot leak between requests and
// Express's Request type needs no global augmentation.
const states = new WeakMap<Request, RequestState>();

function stateOf(request: Request): RequestState {
  const state = states.get(request);
  if (!state) throw new Error('The request context middleware did not run.');
  return state;
}

export function requestIdOf(request: Request): string {
  return stateOf(request).requestId;
}

export function recordErrorCode(request: Request, code: ApiErrorCode): void {
  stateOf(request).errorCode = code;
}

export function setAuthenticatedUser(request: Request, user: PublicUser): void {
  stateOf(request).user = user;
}

/** The session owner resolved by SessionGuard for this request. */
export function authenticatedUserOf(request: Request): PublicUser {
  const { user } = stateOf(request);
  if (!user)
    throw new Error('No authenticated user is attached to this request.');
  return user;
}

/**
 * Assigns a server-generated request ID (client values are ignored), disables
 * caching for API responses, and logs each API request once it finishes.
 */
export function requestContext(logger: AppLogger): RequestHandler {
  return (request, response, next) => {
    const state: RequestState = { requestId: randomUUID() };
    states.set(request, state);
    response.setHeader('X-Request-Id', state.requestId);
    if (isApiPath(request.path)) {
      const startedAt = process.hrtime.bigint();
      response.setHeader('Cache-Control', 'no-store');
      response.on('finish', () => {
        const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e6;
        logger.info({
          event: 'http_request',
          requestId: state.requestId,
          method: request.method,
          route:
            state.errorCode === 'NOT_FOUND' ? null : routeTemplate(request),
          status: response.statusCode,
          durationMs: Math.round(elapsed * 10) / 10,
          ...(state.errorCode ? { code: state.errorCode } : {}),
        });
      });
    }
    next();
  };
}

/** The matched route template, never the raw path, so input stays out of logs. */
function routeTemplate(request: Request): string | null {
  const route: unknown = request.route;
  return typeof route === 'object' &&
    route !== null &&
    'path' in route &&
    typeof route.path === 'string'
    ? route.path
    : null;
}
