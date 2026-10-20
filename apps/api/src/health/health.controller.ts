import type { HealthResponse } from '@easy-generator/contracts';
import { Controller, Get, Header, Inject } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}
