import {
  healthResponseSchema,
  type HealthResponse,
} from '@easy-generator/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async check(): Promise<HealthResponse> {
    return healthResponseSchema.parse({
      status: (await this.database.isReady()) ? 'ok' : 'unavailable',
    });
  }
}
