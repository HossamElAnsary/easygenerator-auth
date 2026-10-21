import { Inject, Injectable } from '@nestjs/common';
import { DependencyUnavailableError } from '../../common/errors.js';
import { Clock } from '../../infrastructure/clock/clock.js';
import {
  generateSessionToken,
  hashSessionToken,
  isSessionToken,
} from './session-token.js';
import { SessionsRepository } from './sessions.repository.js';

/** Fixed lifetime from issuance; no sliding renewal (Architecture A06). */
export const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Internal cookie material. Never serialize it into a response body. */
export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

/** Session policy: tokens, lifetime, expiry, and confirmed revocation. */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(SessionsRepository) private readonly sessions: SessionsRepository,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** Persists a fresh session; returns only after the write is acknowledged. */
  async issue(userId: string): Promise<IssuedSession> {
    const token = generateSessionToken();
    const createdAt = this.clock.now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_LIFETIME_MS);
    await this.sessions.insert({
      tokenHash: hashSessionToken(token),
      userId,
      createdAt,
      expiresAt,
    });
    return { token, expiresAt };
  }

  /** The owner of an unexpired presented session, or null. */
  async findActiveUserId(token: unknown): Promise<string | null> {
    if (!isSessionToken(token)) return null;
    const session = await this.sessions.findByDigest(hashSessionToken(token));
    // TTL deletion is asynchronous, so expiry is enforced here, against server
    // time taken after the read completes.
    if (!session || session.expiresAt.getTime() <= this.clock.now().getTime()) {
      return null;
    }
    return session.userId;
  }

  /**
   * Deletes only the presented session. Resolves once revocation is confirmed;
   * throws DependencyUnavailableError when it cannot be confirmed.
   */
  async revoke(token: unknown): Promise<void> {
    if (!isSessionToken(token)) return;
    const tokenHash = hashSessionToken(token);
    if (await this.sessions.deleteByDigest(tokenHash)) return;
    // Nothing deleted could follow an earlier attempt whose outcome is unknown,
    // or an unacknowledged write, so confirm absence with the same
    // authoritative read (Architecture A10).
    if (await this.sessions.findByDigest(tokenHash))
      throw new DependencyUnavailableError();
  }
}
