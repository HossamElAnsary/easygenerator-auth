import type { RequestHandler } from 'express';
import {
  RequestForbiddenError,
  UnsupportedMediaTypeError,
} from './request-errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Architecture A07: an API mutation needs the exact configured Origin, the
 * `X-CSRF-Protection: 1` header, and a JSON body. Mounted before the body
 * parser, so rejected requests are never read.
 */
export function mutationControls(appOrigin: string): RequestHandler {
  return (request, _response, next) => {
    if (SAFE_METHODS.has(request.method)) {
      next();
      return;
    }
    if (
      request.headers.origin !== appOrigin ||
      request.headers['x-csrf-protection'] !== '1'
    ) {
      next(new RequestForbiddenError());
      return;
    }
    if (!isJsonMediaType(request.headers['content-type'])) {
      next(new UnsupportedMediaTypeError());
      return;
    }
    next();
  };
}

function isJsonMediaType(contentType: string | undefined): boolean {
  return (
    contentType?.split(';')[0]?.trim().toLowerCase() === 'application/json'
  );
}
