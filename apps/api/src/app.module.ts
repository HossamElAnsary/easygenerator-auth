import { Module, type DynamicModule } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { RUNTIME_CONFIG, type RuntimeConfig } from './config/runtime-config.js';
import { DatabaseService } from './database/database.service.js';
import { StartupIndexes } from './database/startup-indexes.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';

@Module({})
export class AppModule {
  static register(config: RuntimeConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [
        { provide: RUNTIME_CONFIG, useValue: config },
        {
          provide: getConnectionToken(),
          useFactory: () => mongoose.createConnection(),
        },
        DatabaseService,
        StartupIndexes,
        HealthService,
      ],
    };
  }
}
