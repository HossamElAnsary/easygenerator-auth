import type { ApiErrorCode } from '@easy-generator/contracts';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import {
  DependencyUnavailableError,
  EmailInUseError,
  InvalidCredentialsError,
  RequestForbiddenError,
  RequestValidationError,
  UnauthenticatedError,
  UnsupportedMediaTypeError,
} from '../common/errors.js';
import { isDatabaseUnavailable } from '../database/database-errors.js';

export interface ApiFailure {
  status: number;
  code: ApiErrorCode;
  message: string;
  fields?: Readonly<Record<string, readonly string[]>>;
}

const failure = (
  status: number,
  code: ApiErrorCode,
  message: string,
): ApiFailure => ({ status, code, message });

const INVALID_BODY = failure(
  400,
  'VALIDATION_ERROR',
  'The request body is invalid.',
);
const UNSUPPORTED_MEDIA = failure(
  415,
  'UNSUPPORTED_MEDIA_TYPE',
  'Send the request body as JSON.',
);
const UNEXPECTED = failure(
  500,
  'INTERNAL_ERROR',
  'An unexpected error occurred. Try again later.',
);

/**
 * Maps any thrown value to the documented error contract (Architecture A05).
 * Messages are fixed strings: input, parser details, and driver errors are
 * never echoed.
 */
export function describeFailure(exception: unknown): ApiFailure {
  if (exception instanceof RequestValidationError) {
    return exception.fields
      ? {
          ...failure(
            400,
            'VALIDATION_ERROR',
            'Please check the highlighted fields.',
          ),
          fields: exception.fields,
        }
      : INVALID_BODY;
  }
  if (exception instanceof InvalidCredentialsError) {
    return failure(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect.',
    );
  }
  if (exception instanceof UnauthenticatedError) {
    return failure(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (exception instanceof RequestForbiddenError) {
    return failure(403, 'REQUEST_FORBIDDEN', 'This request is not allowed.');
  }
  if (exception instanceof NotFoundException) {
    return failure(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  if (exception instanceof EmailInUseError) {
    return failure(
      409,
      'EMAIL_IN_USE',
      'An account with this email already exists.',
    );
  }
  if (exception instanceof UnsupportedMediaTypeError) return UNSUPPORTED_MEDIA;
  if (exception instanceof ThrottlerException) {
    return failure(429, 'RATE_LIMITED', 'Too many requests. Try again later.');
  }
  if (
    exception instanceof DependencyUnavailableError ||
    isDatabaseUnavailable(exception)
  ) {
    return failure(
      503,
      'SERVICE_UNAVAILABLE',
      'The service is temporarily unavailable. Try again shortly.',
    );
  }
  // Nest wraps the JSON parser's SyntaxError in a BadRequestException.
  if (exception instanceof BadRequestException) return INVALID_BODY;
  switch (bodyParserStatus(exception)) {
    case 413:
      return failure(
        413,
        'PAYLOAD_TOO_LARGE',
        'The request body is too large.',
      );
    case 415:
      return UNSUPPORTED_MEDIA;
    case 400:
      return INVALID_BODY;
    default:
      return UNEXPECTED;
  }
}

/** Status of an http-errors error raised by Express's body parser. */
function bodyParserStatus(exception: unknown): number | undefined {
  if (
    typeof exception === 'object' &&
    exception !== null &&
    'type' in exception &&
    typeof exception.type === 'string' &&
    'status' in exception &&
    typeof exception.status === 'number'
  ) {
    return exception.status;
  }
  return undefined;
}
