/** A session to persist. Only the token's digest is ever stored. */
export interface NewSession {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

/** The stored fields that authorization needs. */
export interface StoredSession {
  userId: string;
  expiresAt: Date;
}

/**
 * Session persistence, and its DI token. Implementations report outcomes as
 * the database acknowledged them and apply no expiry or confirmation policy;
 * SessionsService owns both (Engineering E03).
 */
export abstract class SessionsRepository {
  /** Resolves only after the write is acknowledged. */
  abstract insert(session: NewSession): Promise<void>;

  /**
   * True when this call deleted the session. False when nothing matched or
   * the deletion was not acknowledged, so the outcome needs confirming.
   */
  abstract deleteByDigest(tokenHash: string): Promise<boolean>;

  /** Primary, linearizable lookup by the unique digest, bounded in time. */
  abstract findByDigest(tokenHash: string): Promise<StoredSession | null>;
}
