/**
 * Password hashing contract, also the DI token for its Argon2 adapter.
 * Implementations never trim, normalize, or truncate passwords.
 */
export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;
  abstract verify(passwordHash: string, password: string): Promise<boolean>;
  /** Spends one verification when no account matches, then reports a mismatch. */
  abstract verifyUnknownAccount(password: string): Promise<false>;
}
