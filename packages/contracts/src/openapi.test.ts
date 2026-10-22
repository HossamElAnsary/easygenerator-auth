import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  signinRequestSchema,
  signupRequestSchema,
} from './index.js';
import { buildOpenApiDocument } from './openapi.js';

// Distinct values, so a number that appears in the document can only have come
// from this policy.
const POLICY = {
  rateLimits: { signup: 7, signin: 11, logout: 31, other: 121 },
  sessionLifetimeHours: 25,
  bodyLimitKiB: 17,
};

const document = buildOpenApiDocument(POLICY);

type Node = Record<string, unknown>;
const at = (value: unknown, ...keys: string[]): Node =>
  keys.reduce<Node>((node, key) => node[key] as Node, value as Node);
const property = (schema: string, field: string): Node =>
  at(document, 'components', 'schemas', schema, 'properties', field);

describe('OpenAPI document', () => {
  it('is OpenAPI 3.1 and plain JSON', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('documents the length limits that validation enforces through refinements', () => {
    expect(property('SignupRequest', 'name')).toMatchObject({
      minLength: NAME_MIN_LENGTH,
      maxLength: NAME_MAX_LENGTH,
    });
    expect(property('SignupRequest', 'password')).toMatchObject({
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
    });
    for (const schema of ['SignupRequest', 'SigninRequest'])
      expect(property(schema, 'email')).toMatchObject({
        maxLength: EMAIL_MAX_LENGTH,
      });
    expect(property('SigninRequest', 'password')).toMatchObject({
      minLength: 1,
      maxLength: PASSWORD_MAX_LENGTH,
    });
  });

  it('keeps the documented limits true of the validation itself', () => {
    const name = (length: number) => 'a'.repeat(length);
    const signup = (overrides: Node) =>
      signupRequestSchema.safeParse({
        name: name(NAME_MIN_LENGTH),
        email: 'ada@example.com',
        password: 'Analytical-1',
        ...overrides,
      }).success;
    expect(signup({ name: name(NAME_MIN_LENGTH - 1) })).toBe(false);
    expect(signup({ name: name(NAME_MAX_LENGTH) })).toBe(true);
    expect(signup({ name: name(NAME_MAX_LENGTH + 1) })).toBe(false);
    expect(
      signinRequestSchema.safeParse({ email: 'ada@example.com', password: '' })
        .success,
    ).toBe(false);
  });

  it('rejects unexpected fields in every request body, as validation does', () => {
    for (const schema of ['SignupRequest', 'SigninRequest', 'LogoutRequest'])
      expect(at(document, 'components', 'schemas', schema)).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
  });

  it('lists exactly the shared error codes, and documents each one on some response', () => {
    expect(
      at(property('ErrorResponse', 'error'), 'properties', 'code').enum,
    ).toEqual([...API_ERROR_CODES]);
    // Outside the schemas, whose enum would make this check pass trivially.
    const prose = JSON.stringify([document.paths, at(document, 'info')]);
    for (const code of API_ERROR_CODES) expect(prose).toContain(code);
  });

  it('states the policy it was given', () => {
    const description = String(at(document, 'info').description);
    for (const value of [7, 11, 31, 121])
      expect(description).toContain(`${value} per minute`);
    expect(description).toContain('25 hours');
    expect(description).toContain('17 KiB');
  });

  it('requires the CSRF header on every POST and the session cookie on /auth/me', () => {
    const paths = at(document, 'paths');
    for (const [path, item] of Object.entries(paths)) {
      const post = (item as Node).post as Node | undefined;
      if (!post) continue;
      expect(post.parameters, path).toContainEqual({
        $ref: '#/components/parameters/CsrfProtection',
      });
    }
    expect(at(paths, '/api/auth/me', 'get').security).toEqual([
      { sessionCookie: [] },
    ]);
  });

  it('resolves every internal reference', () => {
    const refs = JSON.stringify(document).match(/"\$ref":"[^"]+"/g) ?? [];
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      const pointer = ref.slice('"$ref":"#/'.length, -1).split('/');
      expect(at(document, ...pointer), ref).toBeDefined();
    }
  });
});
