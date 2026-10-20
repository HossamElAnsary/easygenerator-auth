import { Schema } from 'mongoose';
import type { RequiredIndex } from '../database/indexes.js';

export const USER_MODEL = 'User';

/** Stored user. `email` is already normalized by the shared schema. */
export interface UserRecord {
  email: string;
  name: string;
  /** Encoded Argon2id hash, including its parameters and salt. */
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  // `strict: 'throw'` refuses unknown fields instead of silently dropping them.
  { collection: 'users', timestamps: true, versionKey: false, strict: 'throw' },
);

export const USER_INDEXES: readonly RequiredIndex[] = [
  { name: 'email_1', key: { email: 1 }, unique: true },
];
