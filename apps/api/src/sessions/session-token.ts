import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;
// 32 bytes encode to 43 base64url characters. The last one carries only four
// data bits, so a canonical token can end in just these 16 characters.
const CANONICAL_TOKEN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** Shape check before any database work. Cookie values may not be strings. */
export function isSessionToken(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_TOKEN.test(value);
}

/**
 * The stored verifier. The token has 256 bits of entropy, so a fast one-way
 * hash suffices here; passwords use Argon2id instead (Architecture A06).
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
