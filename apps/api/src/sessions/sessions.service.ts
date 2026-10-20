import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { DependencyUnavailableError } from '../common/errors.js';
import { Clock } from '../core/clock.js';
import { withDatabase } from '../database/database-errors.js';
import { LINEARIZABLE_READ_OPTIONS } from '../database/database-options.js';
import { ensureIndexes } from '../database/indexes.js';
import {
  SESSION_INDEXES,
  SESSION_MODEL,
  type SessionRecord,
} from './session.schema.js';
import {
  generateSessionToken,
  hashSessionToken,
  isSessionToken,
} from './session-token.js';

/** Fixed lifetime from issuance; no sliding renewal (Architecture A06). */
export const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Internal cookie material. Never serialize it into a response body. */
export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(SESSION_MODEL) private readonly sessions: Model<SessionRecord>,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  ensureIndexes(): Promise<void> {
    return ensureIndexes(this.sessions.collection, SESSION_INDEXES);
  }

  /** Persists a fresh session; returns only after the write is acknowledged. */
  async issue(userId: string): Promise<IssuedSession> {
    const token = generateSessionToken();
    const createdAt = this.clock.now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_LIFETIME_MS);
    await withDatabase(() =>
      this.sessions.create({
        tokenHash: hashSessionToken(token),
        userId: new Types.ObjectId(userId),
        createdAt,
        expiresAt,
      }),
    );
    return { token, expiresAt };
  }

  /** The owner of an unexpired presented session, or null. */
  async findActiveUserId(token: unknown): Promise<string | null> {
    if (!isSessionToken(token)) return null;
    const session = await this.findAuthoritatively(token);
    // TTL deletion is asynchronous, so expiry is enforced here, against server
    // time taken after the read completes.
    if (!session || session.expiresAt.getTime() <= this.clock.now().getTime()) {
      return null;
    }
    return session.userId.toHexString();
  }

  /**
   * Deletes only the presented session. Resolves once revocation is confirmed;
   * throws DependencyUnavailableError when it cannot be confirmed.
   */
  async revoke(token: unknown): Promise<void> {
    if (!isSessionToken(token)) return;
    const result = await withDatabase(() =>
      this.sessions.deleteOne({ tokenHash: hashSessionToken(token) }),
    );
    if (result.deletedCount === 1) return;
    // Zero matches could follow an earlier attempt whose outcome is unknown
    // (and an unacknowledged write reports no count at all), so confirm
    // absence with the same authoritative read (Architecture A10).
    if (await this.findAuthoritatively(token))
      throw new DependencyUnavailableError();
  }

  /** Primary, linearizable lookup by the unique verifier, bounded in time. */
  private findAuthoritatively(token: string) {
    return withDatabase(() =>
      this.sessions.collection.findOne<
        Pick<SessionRecord, 'userId' | 'expiresAt'>
      >(
        { tokenHash: hashSessionToken(token) },
        {
          projection: { _id: 0, userId: 1, expiresAt: 1 },
          ...LINEARIZABLE_READ_OPTIONS,
        },
      ),
    );
  }
}
