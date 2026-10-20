import type { PublicUser } from '@easy-generator/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { EmailInUseError } from '../common/errors.js';
import { isDuplicateKeyOn, withDatabase } from '../database/database-errors.js';
import { ensureIndexes } from '../database/indexes.js';
import { USER_INDEXES, USER_MODEL, type UserRecord } from './user.schema.js';

/** Internal signin record. Never serialize it: it carries the password hash. */
export interface UserCredentials extends PublicUser {
  passwordHash: string;
}

type NewUser = Pick<UserRecord, 'email' | 'name' | 'passwordHash'>;
type StoredPublicFields = { _id: Types.ObjectId; email: string; name: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USER_MODEL) private readonly users: Model<UserRecord>,
  ) {}

  ensureIndexes(): Promise<void> {
    return ensureIndexes(this.users.collection, USER_INDEXES);
  }

  /**
   * Inserts one user. The unique index decides concurrent duplicates; only a
   * conflict on that index becomes EmailInUseError.
   */
  async create(user: NewUser): Promise<PublicUser> {
    try {
      const created = await withDatabase(() =>
        this.users.create({
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
        }),
      );
      return toPublicUser(created);
    } catch (error) {
      if (isDuplicateKeyOn(error, 'email')) throw new EmailInUseError();
      throw error;
    }
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const user = await withDatabase(() =>
      this.users
        .findOne({ email }, { email: 1, name: 1, passwordHash: 1 })
        .lean<StoredPublicFields & { passwordHash: string }>(),
    );
    return user
      ? { ...toPublicUser(user), passwordHash: user.passwordHash }
      : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await withDatabase(() =>
      this.users.findById(id, { email: 1, name: 1 }).lean<StoredPublicFields>(),
    );
    return user ? toPublicUser(user) : null;
  }
}

/** The only shape that leaves this service for clients: an explicit projection. */
function toPublicUser(user: StoredPublicFields): PublicUser {
  return { id: user._id.toHexString(), email: user.email, name: user.name };
}
