import mongoose from 'mongoose';
import { DependencyUnavailableError } from '../../common/errors.js';

const {
  MongoClientClosedError,
  MongoNetworkError,
  MongoNotConnectedError,
  MongoOperationTimeoutError,
  MongoServerClosedError,
  MongoServerError,
  MongoServerSelectionError,
  MongoStalePrimaryError,
  MongoTopologyClosedError,
  MongoWriteConcernError,
} = mongoose.mongo;

// Server error codes meaning the operation could not be completed or confirmed
// right now. They are availability failures, not application faults.
const UNAVAILABLE_SERVER_CODES = new Set([
  6, // HostUnreachable
  7, // HostNotFound
  50, // MaxTimeMSExpired
  64, // WriteConcernTimeout
  89, // NetworkTimeout
  91, // ShutdownInProgress
  133, // FailedToSatisfyReadPreference
  134, // ReadConcernMajorityNotAvailableYet
  189, // PrimarySteppedDown
  262, // ExceededTimeLimit
  9001, // SocketException
  10107, // NotWritablePrimary
  11600, // InterruptedAtShutdown
  11602, // InterruptedDueToReplStateChange
  13435, // NotPrimaryNoSecondaryOk
  13436, // NotPrimaryOrSecondary
]);

/**
 * True when MongoDB was unreachable, timed out, or could not acknowledge the
 * required write concern. The write may still have been applied.
 */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (
    error instanceof MongoNetworkError ||
    error instanceof MongoServerSelectionError ||
    error instanceof MongoNotConnectedError ||
    error instanceof MongoTopologyClosedError ||
    error instanceof MongoClientClosedError ||
    error instanceof MongoServerClosedError ||
    error instanceof MongoOperationTimeoutError ||
    error instanceof MongoStalePrimaryError ||
    error instanceof MongoWriteConcernError
  ) {
    return true;
  }
  return (
    error instanceof MongoServerError &&
    typeof error.code === 'number' &&
    UNAVAILABLE_SERVER_CODES.has(error.code)
  );
}

/** True for a unique-index conflict on exactly `field`. */
export function isDuplicateKeyOn(error: unknown, field: string): boolean {
  return (
    error instanceof MongoServerError &&
    error.code === 11000 &&
    Object.keys(error.keyPattern ?? {}).join() === field
  );
}

/**
 * Runs a database operation (a promise or an awaitable Mongoose query),
 * reporting availability failures as such.
 */
export async function withDatabase<T>(
  operation: () => PromiseLike<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      throw new DependencyUnavailableError({ cause: error });
    }
    throw error;
  }
}
