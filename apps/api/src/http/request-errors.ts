/**
 * Typed request failures raised by the HTTP pipeline before a handler runs.
 * ApiExceptionFilter maps them to the safe error contract (Architecture A05).
 * None carries user input.
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
