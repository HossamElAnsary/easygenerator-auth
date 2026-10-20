import { Throttle } from '@nestjs/throttler';

// Architecture A07: per route and client IP within one 60-second window. These
// are chosen starting values, not measured capacity; in-memory counters reset
// on restart and are not shared across processes.
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT = 120;
export const SIGNUP_RATE_LIMIT = 5;
export const SIGNIN_RATE_LIMIT = 10;
export const LOGOUT_RATE_LIMIT = 30;

/** Overrides the default limit for one route handler. */
export const RateLimit = (limit: number): MethodDecorator =>
  Throttle({ default: { limit, ttl: RATE_LIMIT_WINDOW_MS } });
