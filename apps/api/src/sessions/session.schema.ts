import { Schema, type Types } from 'mongoose';
import type { RequiredIndex } from '../database/indexes.js';

export const SESSION_MODEL = 'Session';

/** Stored session. Only a SHA-256 verifier of the cookie token is kept. */
export interface SessionRecord {
  tokenHash: string;
  userId: Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

export const sessionSchema = new Schema<SessionRecord>(
  {
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    // Set from the injected clock, so expiry is exactly createdAt + lifetime.
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'sessions', versionKey: false, strict: 'throw' },
);

export const SESSION_INDEXES: readonly RequiredIndex[] = [
  { name: 'tokenHash_1', key: { tokenHash: 1 }, unique: true },
  // TTL removal is cleanup only; lookups enforce expiry themselves.
  { name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];
