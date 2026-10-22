import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { createApplication } from '../src/application.js';
import { validateRuntimeConfig } from '../src/config/runtime-config.js';
import {
  DATABASE_CLIENT_OPTIONS,
  LINEARIZABLE_READ_OPTIONS,
} from '../src/infrastructure/database/database-options.js';
import { DatabaseService } from '../src/infrastructure/database/database.service.js';
import { StartupIndexes } from '../src/infrastructure/database/startup-indexes.js';
import { isolatedDatabase } from './test-database.js';

describe('real replica-set foundation', () => {
  const database = isolatedDatabase();
  const config = validateRuntimeConfig({
    NODE_ENV: 'test',
    MONGODB_URI: database.uri,
    APP_ORIGIN: 'http://localhost:5173',
  });
  let app: NestExpressApplication | undefined;
  let connected = false;

  beforeAll(async () => {
    await database.client.connect();
    connected = true;
    app = await createApplication(config);
  }, 15000);

  afterAll(async () => {
    await app?.close();
    if (connected) await database.cleanup();
    else await database.client.close();
  });

  it('connects through discovery to a writable primary and serves safe readiness', async () => {
    const hello = await database.client
      .db()
      .admin()
      .command({ hello: 1 }, { timeoutMS: 5000 });
    expect(hello).toMatchObject({
      setName: 'easy-generator-rs',
      isWritablePrimary: true,
    });
    if (!app) throw new Error('Application not started.');
    await request(app.getHttpServer())
      .get('/api/health')
      .expect('Cache-Control', 'no-store')
      .expect(200, { status: 'ok' });
    const response = await request(app.getHttpServer())
      .get('/api/unknown')
      .expect(404);
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('uses acknowledged journaled writes and bounded majority/linearizable reads', async () => {
    if (!app) throw new Error('Application not started.');
    const service = app.get(DatabaseService);
    const client = service.connection.getClient();
    expect(client.options).toMatchObject({
      retryWrites: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      readPreference: { mode: 'primary' },
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority', j: true, wtimeoutMS: 5000 },
    });
    const db = service.connection.db;
    if (!db) throw new Error('Database not connected.');
    const records = db.collection<{ _id: string; value: string }>(
      'foundation_probe',
    );
    const result = await records.insertOne({
      _id: database.name,
      value: 'persisted',
    });
    expect(result.acknowledged).toBe(true);
    expect(
      await records.findOne({ _id: database.name }, { maxTimeMS: 5000 }),
    ).toMatchObject({ value: 'persisted' });
    expect(
      await records.findOne({ _id: database.name }, LINEARIZABLE_READ_OPTIONS),
    ).toMatchObject({ value: 'persisted' });
    const deleted = await records.deleteOne({ _id: database.name });
    expect(deleted).toMatchObject({ acknowledged: true, deletedCount: 1 });
    expect(
      await records.findOne({ _id: database.name }, LINEARIZABLE_READ_OPTIONS),
    ).toBeNull();
    expect(DATABASE_CLIENT_OPTIONS.writeConcern.w).toBe('majority');
  });

  it('awaits the index hook and fails closed if verification fails', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.register(config)],
    })
      .overrideProvider(StartupIndexes)
      .useValue({
        verify: async () => {
          throw new Error('index gate fixture');
        },
      })
      .compile();
    try {
      await expect(module.get(DatabaseService).initialize()).rejects.toThrow(
        'Database startup checks failed.',
      );
      expect(await module.get(DatabaseService).isReady()).toBe(false);
    } finally {
      await module.close();
    }
  });

  it('returns unavailable after losing its database connection', async () => {
    if (!app) throw new Error('Application not started.');
    await app.get(DatabaseService).connection.close();
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(503, { status: 'unavailable' });
  });
});
