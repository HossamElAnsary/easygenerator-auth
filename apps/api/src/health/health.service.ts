import {
  healthResponseSchema,
  type HealthResponse,
} from '@easy-generator/contracts';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async check(): Promise<HealthResponse> {
    if (!(await this.database.isReady())) {
      throw new ServiceUnavailableException(
        healthResponseSchema.parse({ status: 'unavailable' }),
      );
    }
    return healthResponseSchema.parse({ status: 'ok' });
  }
}
