import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DependencyUnavailableError } from '../common/errors.js';
import { AppLogger } from '../core/app-logger.js';
import { describeFailure } from './api-failure.js';
import { recordErrorCode, requestIdOf } from './request-context.js';

/** Writes every API failure in the documented shape, with the request ID. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const failure = describeFailure(exception);
    const requestId = requestIdOf(request);
    recordErrorCode(request, failure.code);

    if (failure.code === 'SERVICE_UNAVAILABLE') {
      const cause =
        exception instanceof DependencyUnavailableError
          ? exception.cause
          : exception;
      this.logger.error({
        event: 'dependency_unavailable',
        requestId,
        ...errorDetails(cause),
      });
    } else if (failure.code === 'INTERNAL_ERROR') {
      this.logger.error({
        event: 'unexpected_error',
        requestId,
        ...errorDetails(exception),
      });
    }

    if (response.headersSent) {
      response.end();
      return;
    }
    response
      .status(failure.status)
      .setHeader('Cache-Control', 'no-store')
      .json({
        error: {
          code: failure.code,
          message: failure.message,
          ...(failure.fields ? { fields: failure.fields } : {}),
          requestId,
        },
      });
  }
}

/**
 * Only the error's class name and numeric driver code. Messages and stacks are
 * omitted because driver errors can quote submitted values (Architecture A07).
 */
function errorDetails(error: unknown): {
  errorType?: string;
  driverCode?: number;
} {
  if (typeof error !== 'object' || error === null) return {};
  const name: unknown = error.constructor?.name;
  const code: unknown = 'code' in error ? error.code : undefined;
  return {
    ...(typeof name === 'string' && /^[A-Za-z]\w{0,63}$/.test(name)
      ? { errorType: name }
      : {}),
    ...(typeof code === 'number' ? { driverCode: code } : {}),
  };
}
