import { buildOpenApiDocument } from '@easy-generator/contracts/openapi';
import { JSON_BODY_LIMIT } from '../../http/limits.js';
import {
  DEFAULT_RATE_LIMIT,
  LOGOUT_RATE_LIMIT,
  SIGNIN_RATE_LIMIT,
  SIGNUP_RATE_LIMIT,
} from '../../http/rate-limits.js';
import { SESSION_LIFETIME_MS } from '../sessions/index.js';

/** The OpenAPI document, stating the policy this API actually enforces. */
export const API_DOCUMENT = buildOpenApiDocument({
  rateLimits: {
    signup: SIGNUP_RATE_LIMIT,
    signin: SIGNIN_RATE_LIMIT,
    logout: LOGOUT_RATE_LIMIT,
    other: DEFAULT_RATE_LIMIT,
  },
  sessionLifetimeHours: SESSION_LIFETIME_MS / 3_600_000,
  // `JSON_BODY_LIMIT` is in Express's notation, where `kb` means 1024 bytes.
  bodyLimitKiB: Number.parseInt(JSON_BODY_LIMIT, 10),
});
