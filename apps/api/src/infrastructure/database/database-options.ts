import type { ConnectOptions } from 'mongoose';

/** Architecture A10's time budget for one database operation or check. */
export const DATABASE_BUDGET_MS = 5000;

export const DATABASE_CLIENT_OPTIONS = {
  readPreference: 'primary',
  readConcern: { level: 'majority' },
  writeConcern: { w: 'majority', j: true, wtimeoutMS: DATABASE_BUDGET_MS },
  retryWrites: true,
  serverSelectionTimeoutMS: DATABASE_BUDGET_MS,
  connectTimeoutMS: DATABASE_BUDGET_MS,
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
  maxTimeMS: DATABASE_BUDGET_MS,
} as const;
