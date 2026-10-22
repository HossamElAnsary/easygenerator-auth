import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

/** Readiness. DatabaseService comes from the global DatabaseModule. */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
