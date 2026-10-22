import { z } from 'zod';
import {
  logoutRequestSchema,
  signinRequestSchema,
  signupRequestSchema,
  userResponseSchema,
} from './auth.js';
import { type ApiErrorCode, apiErrorResponseSchema } from './errors.js';
import { healthResponseSchema } from './health.js';

/**
 * The API's runtime policy, supplied by the API so the document states its
 * real values; the contracts package depends on neither application.
 */
export interface ApiDocumentPolicy {
  /** Requests per route and client IP in one 60-second window. */
  rateLimits: { signup: number; signin: number; logout: number; other: number };
  sessionLifetimeHours: number;
  bodyLimitKiB: number;
}

export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export type OpenApiDocument = { [key: string]: Json };

const ERROR_SCHEMA = { $ref: '#/components/schemas/ErrorResponse' };
const USER_RESPONSE = { $ref: '#/components/schemas/UserResponse' };
const CSRF_PARAMETER = { $ref: '#/components/parameters/CsrfProtection' };
const EXAMPLE_ACCOUNT = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'Analytical-1',
};
const EXAMPLE_USER = {
  user: {
    id: '6650f0c2a4b1c2d3e4f50607',
    email: EXAMPLE_ACCOUNT.email,
    name: EXAMPLE_ACCOUNT.name,
  },
};

/** JSON Schema 2020-12 from a shared schema, as an OpenAPI 3.1 component. */
function jsonSchema(schema: z.ZodType, io: 'input' | 'output'): Json {
  const component = JSON.parse(
    JSON.stringify(z.toJSONSchema(schema, { io })),
  ) as { [key: string]: Json };
  // OpenAPI 3.1 already declares the JSON Schema dialect for the document.
  delete component.$schema;
  return component;
}

function failure(description: string, codes: ApiErrorCode[]): Json {
  return {
    description: `${description}: ${codes.map((code) => `\`${code}\``).join(', ')}.`,
    content: { 'application/json': { schema: ERROR_SCHEMA } },
  };
}

/** Failures any API route can return, whatever its own contract. */
const COMMON_FAILURES = {
  '429': failure('Too many requests from this client; see `Retry-After`', [
    'RATE_LIMITED',
  ]),
  '500': failure('Unexpected error', ['INTERNAL_ERROR']),
};

/** Failures from the request controls, which run before any handler. */
const MUTATION_FAILURES = {
  '403': failure('Missing or wrong `Origin` or `X-CSRF-Protection`', [
    'REQUEST_FORBIDDEN',
  ]),
  '413': failure('Body larger than the limit', ['PAYLOAD_TOO_LARGE']),
  '415': failure('Body is not uncompressed JSON', ['UNSUPPORTED_MEDIA_TYPE']),
};

function jsonBody(ref: string, example: Json): Json {
  return {
    required: true,
    content: {
      'application/json': { schema: { $ref: ref }, example },
    },
  };
}

function userSuccess(description: string, headers?: Json): Json {
  return {
    description,
    ...(headers ? { headers } : {}),
    content: {
      'application/json': { schema: USER_RESPONSE, example: EXAMPLE_USER },
    },
  };
}

function overview(policy: ApiDocumentPolicy): string {
  const { rateLimits } = policy;
  return [
    'The authentication API behind the Easy Generator test task. All routes are under `/api`, every response sends `Cache-Control: no-store` and a server-generated `X-Request-Id`, and the request rules come from the same shared schemas that the browser and the server validate with.',
    '',
    '## Request controls',
    '',
    `Every POST must send \`Origin\` exactly equal to the app's address, \`X-CSRF-Protection: 1\`, and an uncompressed \`Content-Type: application/json\` body of at most ${policy.bodyLimitKiB} KiB. Otherwise the handler never runs. CORS is disabled.`,
    '',
    '"Try it out" on this page works because it is served from the same origin as the API. Desktop tools such as Postman or Insomnia work if they set `Origin` to the app\'s address. Browser-hosted tools on another origin cannot call this API, by design.',
    '',
    '## Sessions',
    '',
    `Signin issues an opaque 256-bit token in an \`HttpOnly\`, \`SameSite=Lax\`, \`Path=/\` cookie: \`session\` over local HTTP, and \`__Host-session\` with \`Secure\` in production. A session lasts exactly ${policy.sessionLifetimeHours} hours from signin, with no renewal, and the server stores only a hash of the token. \`GET /api/auth/me\` never sets or clears cookies. Logout revokes only the presented session.`,
    '',
    '## Errors',
    '',
    'Every failure has the shape `{ "error": { "code", "message", "fields"?, "requestId" } }`. `fields` appears only for field validation errors. Messages never echo input. Unknown API routes return `404` with `NOT_FOUND`, never the web page.',
    '',
    '## Rate limits',
    '',
    `Per route and client IP: signup ${rateLimits.signup} per minute, signin ${rateLimits.signin} per minute, logout ${rateLimits.logout} per minute, and every other route ${rateLimits.other} per minute. A \`429\` includes \`Retry-After\` in seconds. Counters live in memory and reset on restart.`,
  ].join('\n');
}

/** The OpenAPI 3.1 description of the API (Requirements B05). */
export function buildOpenApiDocument(
  policy: ApiDocumentPolicy,
): OpenApiDocument {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Easy Generator authentication API',
      version: '1.0.0',
      description: overview(policy),
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'auth', description: 'Accounts and sessions' },
      { name: 'health', description: 'Readiness' },
    ],
    paths: {
      '/api/auth/signup': {
        post: {
          tags: ['auth'],
          operationId: 'signup',
          summary: 'Create an account',
          description:
            'Creates the account only; signup never starts a session.',
          parameters: [CSRF_PARAMETER],
          requestBody: jsonBody(
            '#/components/schemas/SignupRequest',
            EXAMPLE_ACCOUNT,
          ),
          responses: {
            '201': userSuccess('The account was created.'),
            '400': failure(
              'The body failed validation; field errors are listed in `fields`',
              ['VALIDATION_ERROR'],
            ),
            '409': failure('The email is already registered', ['EMAIL_IN_USE']),
            ...MUTATION_FAILURES,
            ...COMMON_FAILURES,
            '503': failure('The database is unavailable', [
              'SERVICE_UNAVAILABLE',
            ]),
          },
        },
      },
      '/api/auth/signin': {
        post: {
          tags: ['auth'],
          operationId: 'signin',
          summary: 'Sign in and start a session',
          description:
            'Verifies the credentials, then sets a new session cookie. An unknown email and a wrong password get the same error.',
          parameters: [CSRF_PARAMETER],
          requestBody: jsonBody('#/components/schemas/SigninRequest', {
            email: EXAMPLE_ACCOUNT.email,
            password: EXAMPLE_ACCOUNT.password,
          }),
          responses: {
            '200': userSuccess('Signed in.', {
              'Set-Cookie': {
                description: 'The new session cookie.',
                schema: { type: 'string' },
              },
            }),
            '400': failure(
              'The body failed validation; field errors are listed in `fields`',
              ['VALIDATION_ERROR'],
            ),
            '401': failure('The email or password is incorrect', [
              'INVALID_CREDENTIALS',
            ]),
            ...MUTATION_FAILURES,
            ...COMMON_FAILURES,
            '503': failure('The database is unavailable', [
              'SERVICE_UNAVAILABLE',
            ]),
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['auth'],
          operationId: 'getCurrentUser',
          summary: 'The signed-in user (the protected endpoint)',
          description:
            "Requires a valid, unexpired session and returns only that session's owner.",
          security: [{ sessionCookie: [] }],
          responses: {
            '200': userSuccess('The session owner.'),
            '401': failure('No valid session', ['UNAUTHENTICATED']),
            ...COMMON_FAILURES,
            '503': failure('The database is unavailable', [
              'SERVICE_UNAVAILABLE',
            ]),
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['auth'],
          operationId: 'logout',
          summary: 'Sign out',
          description:
            'Revokes the presented session, if any, and expires the cookie only after the revocation is confirmed. Idempotent.',
          parameters: [CSRF_PARAMETER],
          requestBody: jsonBody('#/components/schemas/LogoutRequest', {}),
          responses: {
            '204': {
              description: 'Signed out; the cookie is expired.',
              headers: {
                'Set-Cookie': {
                  description: 'The expired session cookie.',
                  schema: { type: 'string' },
                },
              },
            },
            '400': failure('The body is not `{}`', ['VALIDATION_ERROR']),
            ...MUTATION_FAILURES,
            ...COMMON_FAILURES,
            '503': failure(
              'Revocation could not be confirmed; the cookie is kept',
              ['SERVICE_UNAVAILABLE'],
            ),
          },
        },
      },
      '/api/health': {
        get: {
          tags: ['health'],
          operationId: 'getHealth',
          summary: 'Readiness',
          responses: {
            '200': {
              description: 'The API and the database are ready.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                  example: { status: 'ok' },
                },
              },
            },
            '503': {
              description: 'Not ready. No infrastructure details are given.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                  example: { status: 'unavailable' },
                },
              },
            },
            ...COMMON_FAILURES,
          },
        },
      },
    },
    components: {
      schemas: {
        SignupRequest: jsonSchema(signupRequestSchema, 'input'),
        SigninRequest: jsonSchema(signinRequestSchema, 'input'),
        LogoutRequest: jsonSchema(logoutRequestSchema, 'input'),
        UserResponse: jsonSchema(userResponseSchema, 'output'),
        ErrorResponse: jsonSchema(apiErrorResponseSchema, 'output'),
        HealthResponse: jsonSchema(healthResponseSchema, 'output'),
      },
      parameters: {
        CsrfProtection: {
          name: 'X-CSRF-Protection',
          in: 'header',
          required: true,
          description: 'Required on every POST. The only accepted value is 1.',
          schema: { type: 'string', enum: ['1'], default: '1' },
        },
      },
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description:
            'Set by signin and sent by the browser; scripts cannot read it. Named `__Host-session` in production.',
        },
      },
    },
  };
}
