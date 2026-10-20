import {
  healthResponseSchema,
  type HealthResponse,
} from '@easy-generator/contracts';
import {
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  StandardSchemaValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { argon2id, hash, verify } from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

@Injectable()
class SmokeService {
  check(): HealthResponse {
    return healthResponseSchema.parse({ status: 'ok' });
  }
}

// Kept outside src so tooling verification cannot expose a production mutation.
@Controller('schema-smoke')
class SchemaSmokeController {
  constructor(private readonly smoke: SmokeService) {}

  @Get()
  check(): HealthResponse {
    return this.smoke.check();
  }

  @Post()
  validate(
    @Body({ schema: healthResponseSchema }) body: HealthResponse,
  ): HealthResponse {
    return body;
  }
}

describe('Nest ESM tooling and shared schema integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SmokeService],
      controllers: [SchemaSmokeController],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('resolves constructor-injected providers using emitted decorator metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schema-smoke')
      .expect(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('applies the shared schema through Nest standard-schema validation', async () => {
    await request(app.getHttpServer())
      .post('/api/schema-smoke')
      .send({ status: 'ok' })
      .expect(201, { status: 'ok' });

    await request(app.getHttpServer())
      .post('/api/schema-smoke')
      .send({ status: 'ok', unexpected: true })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/schema-smoke')
      .send({ status: 'other' })
      .expect(400);
  });

  it('loads the native Argon2 addon on the pinned runtime', async () => {
    const encoded = await hash('tooling-smoke-only', {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    expect(await verify(encoded, 'tooling-smoke-only')).toBe(true);
  });
});
