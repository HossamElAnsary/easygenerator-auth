import type { ConnectOptions } from 'mongoose';

export const DATABASE_CLIENT_OPTIONS = {
  readPreference: 'primary',
  readConcern: { level: 'majority' },
  writeConcern: { w: 'majority', j: true, wtimeoutMS: 5000 },
  retryWrites: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
} satisfies ConnectOptions;

export const DATABASE_OPTIONS = {
  ...DATABASE_CLIENT_OPTIONS,
  autoIndex: false,
  autoCreate: false,
  bufferCommands: false,
} satisfies ConnectOptions;

export const LINEARIZABLE_READ_OPTIONS = {
  readPreference: 'primary',
  readConcern: { level: 'linearizable' },
  maxTimeMS: 5000,
} as const;
