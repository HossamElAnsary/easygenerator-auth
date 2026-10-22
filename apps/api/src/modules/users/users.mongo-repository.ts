import type { PublicUser } from '@easy-generator/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { EmailInUseError } from '../../common/errors.js';
import {
  isDuplicateKeyOn,
  withDatabase,
} from '../../infrastructure/database/database-errors.js';
import { USER_MODEL, type UserRecord } from './user.schema.js';
import {
  type NewUser,
  type UserCredentials,
  UsersRepository,
} from './users.repository.js';

type StoredPublicFields = { _id: Types.ObjectId; email: string; name: string };

@Injectable()
export class MongoUsersRepository extends UsersRepository {
  constructor(
    @InjectModel(USER_MODEL) private readonly users: Model<UserRecord>,
  ) {
    super();
  }

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
      ? { user: toPublicUser(user), passwordHash: user.passwordHash }
      : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await withDatabase(() =>
      this.users.findById(id, { email: 1, name: 1 }).lean<StoredPublicFields>(),
    );
    return user ? toPublicUser(user) : null;
  }
}

/** The only shape that leaves this adapter for clients: an explicit projection. */
function toPublicUser(user: StoredPublicFields): PublicUser {
  return { id: user._id.toHexString(), email: user.email, name: user.name };
}
