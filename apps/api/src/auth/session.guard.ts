import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UnauthenticatedError } from '../common/errors.js';
import { setAuthenticatedUser } from '../http/request-context.js';
import { AuthService } from './auth.service.js';
import { PUBLIC_ROUTE } from './public.decorator.js';
import { SessionCookie } from './session-cookie.js';

/**
 * Application-wide guard: every handler requires a valid session unless the
 * handler itself is marked `@Public()`. Identity comes only from the stored
 * session, never from client-supplied IDs.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionCookie) private readonly cookie: SessionCookie,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get<boolean>(PUBLIC_ROUTE, context.getHandler())) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.auth.authenticate(this.cookie.read(request));
    if (!user) throw new UnauthenticatedError();
    setAuthenticatedUser(request, user);
    return true;
  }
}
