import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { withDatabase } from '../../infrastructure/database/database-errors.js';
import { LINEARIZABLE_READ_OPTIONS } from '../../infrastructure/database/database-options.js';
import { SESSION_MODEL, type SessionRecord } from './session.schema.js';
import {
  type NewSession,
  SessionsRepository,
  type StoredSession,
} from './sessions.repository.js';

@Injectable()
export class MongoSessionsRepository extends SessionsRepository {
  constructor(
    @InjectModel(SESSION_MODEL) private readonly sessions: Model<SessionRecord>,
  ) {
    super();
  }

  async insert(session: NewSession): Promise<void> {
    await withDatabase(() =>
      this.sessions.create({
        tokenHash: session.tokenHash,
        userId: new Types.ObjectId(session.userId),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }),
    );
  }

  async deleteByDigest(tokenHash: string): Promise<boolean> {
    const result = await withDatabase(() =>
      this.sessions.deleteOne({ tokenHash }),
    );
    // An unacknowledged write reports no count at all.
    return result.deletedCount === 1;
  }

  async findByDigest(tokenHash: string): Promise<StoredSession | null> {
    const session = await withDatabase(() =>
      this.sessions.collection.findOne<
        Pick<SessionRecord, 'userId' | 'expiresAt'>
      >(
        { tokenHash },
        {
          projection: { _id: 0, userId: 1, expiresAt: 1 },
          ...LINEARIZABLE_READ_OPTIONS,
        },
      ),
    );
    return session
      ? { userId: session.userId.toHexString(), expiresAt: session.expiresAt }
      : null;
  }
}
