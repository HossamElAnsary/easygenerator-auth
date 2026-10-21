import { type DynamicModule, Module } from '@nestjs/common';
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from '../config/runtime-config.js';
import { Clock } from './clock/clock.js';
import { AppLogger } from './logging/app-logger.js';

/**
 * The vendor-free application kernel: validated configuration, the safe
 * logger, and server time. Global because nearly every provider uses one.
 */
@Module({})
export class CoreModule {
  static register(config: RuntimeConfig): DynamicModule {
    return {
      module: CoreModule,
      global: true,
      providers: [
        { provide: RUNTIME_CONFIG, useValue: config },
        AppLogger,
        Clock,
      ],
      exports: [RUNTIME_CONFIG, AppLogger, Clock],
    };
  }
}
