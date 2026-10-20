/**
 * Typed failures. Services and middleware throw these; ApiExceptionFilter maps
 * them to the safe error contract (Architecture A05). None carries user input.
 */

/** Body failed the shared schema. `fields` holds field-level messages only. */
export class RequestValidationError extends Error {
  override readonly name = 'RequestValidationError';

  constructor(readonly fields?: Readonly<Record<string, readonly string[]>>) {
    super('The request failed validation.');
  }
}

/** Mutation without the exact origin or the custom CSRF header. */
export class RequestForbiddenError extends Error {
  override readonly name = 'RequestForbiddenError';

  constructor() {
    super('The request did not meet the mutation controls.');
  }
}

/** Mutation body that is not uncompressed JSON. */
export class UnsupportedMediaTypeError extends Error {
  override readonly name = 'UnsupportedMediaTypeError';

  constructor() {
    super('The request body must be JSON.');
  }
}

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
