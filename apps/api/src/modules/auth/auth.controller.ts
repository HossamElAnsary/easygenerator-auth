import {
  type LogoutRequest,
  logoutRequestSchema,
  type ParsedSigninRequest,
  type ParsedSignupRequest,
  type PublicUser,
  signinRequestSchema,
  signupRequestSchema,
  type UserResponse,
} from '@easy-generator/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  LOGOUT_RATE_LIMIT,
  RateLimit,
  SIGNIN_RATE_LIMIT,
  SIGNUP_RATE_LIMIT,
} from '../../http/rate-limits.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { SessionCookie } from './session-cookie.js';

/**
 * HTTP adapter for authentication: status codes, cookies, and the explicit
 * `{ user }` projection. Business rules live in AuthService.
 */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionCookie) private readonly cookie: SessionCookie,
  ) {}

  @Public()
  @RateLimit(SIGNUP_RATE_LIMIT)
  @Post('signup')
  async signup(
    @Body({ schema: signupRequestSchema }) body: ParsedSignupRequest,
  ): Promise<UserResponse> {
    return { user: await this.auth.signup(body) };
  }

  @Public()
  @RateLimit(SIGNIN_RATE_LIMIT)
  @Post('signin')
  @HttpCode(200)
  async signin(
    @Body({ schema: signinRequestSchema }) body: ParsedSigninRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const { user, session } = await this.auth.signin(body);
    this.cookie.write(response, session);
    return { user };
  }

  /** The protected endpoint (R07). Never sets or clears cookies, even on 401. */
  @Get('me')
  me(@CurrentUser() user: PublicUser): UserResponse {
    return { user };
  }

  @Public()
  @RateLimit(LOGOUT_RATE_LIMIT)
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Body({ schema: logoutRequestSchema }) _body: LogoutRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    // The cookie is cleared only after revocation is confirmed; a failure
    // propagates as 503 and leaves the cookie in place.
    await this.auth.logout(this.cookie.read(request));
    this.cookie.clear(response);
  }
}
