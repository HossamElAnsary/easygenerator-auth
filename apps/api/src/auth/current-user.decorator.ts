import type { PublicUser } from '@easy-generator/contracts';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { authenticatedUserOf } from '../http/request-context.js';

/** The session owner that SessionGuard resolved for this request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser =>
    authenticatedUserOf(context.switchToHttp().getRequest<Request>()),
);
