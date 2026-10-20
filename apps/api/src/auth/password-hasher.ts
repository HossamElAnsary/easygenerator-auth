import { randomBytes } from 'node:crypto';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/** Architecture A06 floor. Benchmark before raising it. */
export const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

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

@Injectable()
export class Argon2PasswordHasher
  extends PasswordHasher
  implements OnModuleInit
{
  private dummyHash: string | undefined;

  async onModuleInit(): Promise<void> {
    // A hash of a random secret with the same parameters as stored hashes, so
    // an unknown email costs about as much as a wrong password.
    this.dummyHash = await hash(
      randomBytes(32).toString('base64url'),
      ARGON2_OPTIONS,
    );
  }

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }

  async verifyUnknownAccount(password: string): Promise<false> {
    if (!this.dummyHash)
      throw new Error('The password hasher is not initialized.');
    await verify(this.dummyHash, password);
    return false;
  }
}
