import type { HealthResponse } from '@easy-generator/contracts';
import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator.js';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  // Readiness has its own contract, `{ status }`, rather than the error shape.
  @Public()
  @Get()
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponse> {
    const result = await this.health.check();
    if (result.status === 'unavailable') response.status(503);
    return result;
  }
}
