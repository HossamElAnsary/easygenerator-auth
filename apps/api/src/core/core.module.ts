import { type DynamicModule, Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from '../config/runtime-config.js';
import { AppLogger } from './app-logger.js';
import { Clock } from './clock.js';

/**
 * Application-wide infrastructure. The Mongoose connection is created here
 * unopened; DatabaseService opens it with the fixed concern policy before the
 * application accepts traffic.
 */
@Module({})
export class CoreModule {
  static register(config: RuntimeConfig): DynamicModule {
    const connection = {
      provide: getConnectionToken(),
      useFactory: () => mongoose.createConnection(),
    };
    return {
      module: CoreModule,
      global: true,
      providers: [
        { provide: RUNTIME_CONFIG, useValue: config },
        connection,
        AppLogger,
        Clock,
      ],
      exports: [RUNTIME_CONFIG, connection.provide, AppLogger, Clock],
    };
  }
}
