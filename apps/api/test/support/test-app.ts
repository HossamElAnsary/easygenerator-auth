import { randomUUID } from 'node:crypto';
import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { expect } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import {
  NEST_APPLICATION_OPTIONS,
  startApplication,
  WEB_DIRECTORY,
} from '../../src/application.js';
import { validateRuntimeConfig } from '../../src/config/runtime-config.js';
import { AppLogger, type LogRecord } from '../../src/core/app-logger.js';
import { Clock } from '../../src/core/clock.js';
import { isolatedDatabase } from '../test-database.js';

export const TEST_ORIGIN = 'http://localhost:5173';

/** Keeps each log line exactly as serialized, without printing it. */
export class CapturingLogger extends AppLogger {
  readonly lines: string[] = [];

  get records(): LogRecord[] {
    return this.lines.map((line) => JSON.parse(line) as LogRecord);
  }

  protected override emit(level: 'info' | 'error', record: LogRecord): void {
    this.lines.push(JSON.stringify({ level, ...record }));
  }
}

/**
 * Real time plus a controlled offset, so stored expiry stays in the real
 * future and TTL cleanup cannot interfere. Freezing makes boundaries exact.
 */
export class TestClock extends Clock {
  private frozenAt: number | undefined;
  private offsetMs = 0;

  override now(): Date {
    return new Date((this.frozenAt ?? Date.now()) + this.offsetMs);
  }

  freeze(): void {
    this.frozenAt = Date.now();
  }

  advance(milliseconds: number): void {
    this.offsetMs += milliseconds;
  }
}

export type IsolatedDatabase = ReturnType<typeof isolatedDatabase>;

export interface TestAppOptions {
  env?: Record<string, string>;
  /** Reuse a database owned by another TestApp, e.g. to simulate an API restart. */
  database?: IsolatedDatabase;
  webDirectory?: string;
  imports?: Type[];
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

export interface TestApp {
  app: NestExpressApplication;
  /** The configured APP_ORIGIN that mutations must present. */
  origin: string;
  database: IsolatedDatabase;
  logger: CapturingLogger;
  clock: TestClock;
  close(): Promise<void>;
}

/**
 * Starts the real application module and HTTP pipeline (the same
 * startApplication used in production) against a database owned by this run.
 */
export async function startTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  const ownsDatabase = options.database === undefined;
  const database = options.database ?? isolatedDatabase();
  if (ownsDatabase) await database.client.connect();
  const config = validateRuntimeConfig({
    NODE_ENV: 'test',
    MONGODB_URI: database.uri,
    APP_ORIGIN: TEST_ORIGIN,
    // Supertest connects from loopback. Trusting only that hop lets each test
    // choose its client address, so per-IP limits stay enforced but isolated.
    TRUST_PROXY: '127.0.0.1',
    ...options.env,
  });
  const logger = new CapturingLogger();
  const clock = new TestClock();
  let builder = Test.createTestingModule({
    imports: [AppModule.register(config), ...(options.imports ?? [])],
  })
    .overrideProvider(AppLogger)
    .useValue(logger)
    .overrideProvider(Clock)
    .useValue(clock);
  if (options.override) builder = options.override(builder);
  const app = (
    await builder.compile()
  ).createNestApplication<NestExpressApplication>(NEST_APPLICATION_OPTIONS);
  try {
    await startApplication(app, config, options.webDirectory ?? WEB_DIRECTORY);
    await app.listen(0, '127.0.0.1');
  } catch (error) {
    if (ownsDatabase) await database.cleanup();
    throw error;
  }
  return {
    app,
    origin: config.appOrigin,
    database,
    logger,
    clock,
    async close() {
      await app.close();
      if (ownsDatabase) await database.cleanup();
    },
  };
}

let clientCounter = 0;

/** A distinct private-range client address per call. */
export function clientIp(): string {
  clientCounter += 1;
  return `10.${(clientCounter >> 16) & 255}.${(clientCounter >> 8) & 255}.${clientCounter & 255}`;
}

/** Requests from a fresh client address; POSTs carry the required controls. */
export function api(testApp: TestApp) {
  const server = testApp.app.getHttpServer();
  return {
    get: (path: string, ip = clientIp()) =>
      request(server).get(path).set('X-Forwarded-For', ip),
    post: (path: string, ip = clientIp()) =>
      request(server)
        .post(path)
        .set('Origin', testApp.origin)
        .set('X-CSRF-Protection', '1')
        .set('X-Forwarded-For', ip),
  };
}

export interface Account {
  name: string;
  email: string;
  password: string;
}

export function newAccount(overrides: Partial<Account> = {}): Account {
  return {
    name: 'Grace Hopper',
    email: `grace.${randomUUID()}@example.com`,
    password: 'Compiler-1952',
    ...overrides,
  };
}

export interface SetCookie {
  name: string;
  value: string;
  attributes: Map<string, string>;
}

/** Parses Set-Cookie headers; attribute names are lower-cased, flags map to ''. */
export function setCookies(response: {
  headers: Record<string, unknown>;
}): SetCookie[] {
  const header = response.headers['set-cookie'];
  const lines = Array.isArray(header) ? (header as string[]) : [];
  return lines.map((line) => {
    const [pair = '', ...parts] = line.split(';').map((part) => part.trim());
    const separator = pair.indexOf('=');
    const attributes = new Map<string, string>();
    for (const part of parts) {
      const [key = '', ...value] = part.split('=');
      attributes.set(key.toLowerCase(), value.join('='));
    }
    return {
      name: pair.slice(0, separator),
      value: pair.slice(separator + 1),
      attributes,
    };
  });
}

export async function signUp(testApp: TestApp, account: Account) {
  const response = await api(testApp).post('/api/auth/signup').send(account);
  expect(response.status).toBe(201);
  return response.body.user as { id: string; email: string; name: string };
}

/** Signs in and returns the raw token plus a ready-to-send Cookie header. */
export async function signIn(testApp: TestApp, account: Account) {
  const response = await api(testApp)
    .post('/api/auth/signin')
    .send({ email: account.email, password: account.password });
  expect(response.status).toBe(200);
  const cookie = setCookies(response).find(({ name }) => name === 'session');
  if (!cookie) throw new Error('Signin did not set the session cookie.');
  return {
    response,
    token: cookie.value,
    cookieHeader: `session=${cookie.value}`,
    user: response.body.user as { id: string; email: string; name: string },
  };
}
