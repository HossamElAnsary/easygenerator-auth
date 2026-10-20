import { Inject, Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from '../config/runtime-config.js';
import type { IssuedSession } from '../sessions/sessions.service.js';

/**
 * The session cookie's name and attributes (Architecture A06), derived from
 * validated configuration only: production cannot opt out of Secure.
 */
@Injectable()
export class SessionCookie {
  /** `__Host-` requires Secure, Path=/, and no Domain, all of which apply. */
  readonly name: string;
  private readonly attributes: CookieOptions;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    const secure = config.mode === 'production';
    this.name = secure ? '__Host-session' : 'session';
    this.attributes = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  }

  /** The presented value; shape is checked by the sessions service. */
  read(request: Request): unknown {
    const cookies: unknown = request.cookies;
    return typeof cookies === 'object' && cookies !== null
      ? (cookies as Record<string, unknown>)[this.name]
      : undefined;
  }

  /** Lifetime matches the stored expiry exactly. */
  write(response: Response, session: IssuedSession): void {
    response.cookie(this.name, session.token, {
      ...this.attributes,
      expires: session.expiresAt,
    });
  }

  /** Same name and attributes as issuance, with an expired date. */
  clear(response: Response): void {
    response.clearCookie(this.name, this.attributes);
  }
}
