import { Inject, Injectable } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service.js';
import { UsersService } from '../users/users.service.js';

/**
 * The startup index gate. DatabaseService awaits it after connecting and
 * before readiness, so the application never serves without its indexes.
 */
@Injectable()
export class StartupIndexes {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  async verify(): Promise<void> {
    await this.users.ensureIndexes();
    await this.sessions.ensureIndexes();
  }
}
