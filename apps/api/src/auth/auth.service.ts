import type {
  ParsedSigninRequest,
  ParsedSignupRequest,
  PublicUser,
} from '@easy-generator/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '../common/errors.js';
import {
  type IssuedSession,
  SessionsService,
} from '../sessions/sessions.service.js';
import { UsersService } from '../users/users.service.js';
import { PasswordHasher } from './password-hasher.js';

/** Authentication use cases. No HTTP objects, models, or hashing library here. */
@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
  ) {}

  /** Creates the account only; signup never starts a session. */
  async signup(input: ParsedSignupRequest): Promise<PublicUser> {
    const passwordHash = await this.hasher.hash(input.password);
    return this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
  }

  /**
   * Verifies credentials, then persists a new independent session. Returns
   * cookie material only after the session write is acknowledged.
   */
  async signin(
    input: ParsedSigninRequest,
  ): Promise<{ user: PublicUser; session: IssuedSession }> {
    const account = await this.users.findCredentialsByEmail(input.email);
    const matches = account
      ? await this.hasher.verify(account.passwordHash, input.password)
      : await this.hasher.verifyUnknownAccount(input.password);
    if (!account || !matches) throw new InvalidCredentialsError();
    const session = await this.sessions.issue(account.id);
    return {
      user: { id: account.id, email: account.email, name: account.name },
      session,
    };
  }

  /** The owner of a valid, unexpired session that still exists, or null. */
  async authenticate(token: unknown): Promise<PublicUser | null> {
    const userId = await this.sessions.findActiveUserId(token);
    return userId ? this.users.findPublicById(userId) : null;
  }

  /** Revokes the presented session only. */
  logout(token: unknown): Promise<void> {
    return this.sessions.revoke(token);
  }
}
