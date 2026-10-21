/**
 * Typed domain and dependency failures. Services throw these; the HTTP layer's
 * ApiExceptionFilter maps them to the safe error contract (Architecture A05).
 * None carries user input. Request-control failures live in `http/`.
 */

/** Unknown email or wrong password; deliberately indistinguishable. */
export class InvalidCredentialsError extends Error {
  override readonly name = 'InvalidCredentialsError';

  constructor() {
    super('The credentials did not match an account.');
  }
}

/** Missing, malformed, expired, or revoked session, or a deleted user. */
export class UnauthenticatedError extends Error {
  override readonly name = 'UnauthenticatedError';

  constructor() {
    super('The request has no valid session.');
  }
}

/** The normalized email is already registered (unique index conflict). */
export class EmailInUseError extends Error {
  override readonly name = 'EmailInUseError';

  constructor() {
    super('The email address is already registered.');
  }
}

/**
 * A dependency failed or could not confirm an outcome. The operation may or
 * may not have been applied, so callers must not report success or rollback.
 */
export class DependencyUnavailableError extends Error {
  override readonly name = 'DependencyUnavailableError';

  constructor(options?: { cause?: unknown }) {
    super('A required dependency is unavailable.', options);
  }
}
