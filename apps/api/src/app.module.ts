import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { SessionGuard } from './auth/session.guard.js';
import type { RuntimeConfig } from './config/runtime-config.js';
import { CoreModule } from './core/core.module.js';
import { DatabaseService } from './database/database.service.js';
import { StartupIndexes } from './database/startup-indexes.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { ApiExceptionFilter } from './http/api-exception.filter.js';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
} from './http/rate-limits.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({})
export class AppModule {
  static register(config: RuntimeConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CoreModule.register(config),
        ThrottlerModule.forRoot({
          throttlers: [
            {
              name: 'default',
              ttl: RATE_LIMIT_WINDOW_MS,
              limit: DEFAULT_RATE_LIMIT,
            },
          ],
        }),
        UsersModule,
        SessionsModule,
        AuthModule,
      ],
      controllers: [HealthController],
      providers: [
        DatabaseService,
        StartupIndexes,
        HealthService,
        // Global guards run in this order: throttling precedes authentication,
        // so unauthenticated floods are limited before any session lookup.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}
