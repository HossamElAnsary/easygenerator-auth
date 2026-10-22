import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { RuntimeConfig } from './config/runtime-config.js';
import { ApiExceptionFilter } from './http/api-exception.filter.js';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
} from './http/rate-limits.js';
import { CoreModule } from './infrastructure/core.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { AuthModule, SessionGuard } from './modules/auth/index.js';
import { HealthModule } from './modules/health/index.js';
import { RequiredIndexes } from './startup-indexes.js';

@Module({})
export class AppModule {
  static register(config: RuntimeConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CoreModule.register(config),
        DatabaseModule.forRoot(RequiredIndexes),
        ThrottlerModule.forRoot({
          throttlers: [
            {
              name: 'default',
              ttl: RATE_LIMIT_WINDOW_MS,
              limit: DEFAULT_RATE_LIMIT,
            },
          ],
        }),
        AuthModule,
        HealthModule,
      ],
      providers: [
        // Global guards run in this order: throttling precedes authentication,
        // so unauthenticated floods are limited before any session lookup.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}
