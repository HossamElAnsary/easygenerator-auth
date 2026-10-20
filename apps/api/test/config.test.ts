import { describe, expect, it } from 'vitest';
import { validateRuntimeConfig } from '../src/config/runtime-config.js';

const valid = {
  NODE_ENV: 'development',
  MONGODB_URI:
    'mongodb://localhost:27018/easy_generator?replicaSet=easy-generator-rs',
  APP_ORIGIN: 'http://localhost:5173',
};

describe('runtime configuration', () => {
  it('uses safe defaults and accepts explicit production ingress', () => {
    expect(validateRuntimeConfig(valid)).toMatchObject({
      port: 3000,
      serveWeb: false,
      trustProxy: false,
    });
    expect(
      validateRuntimeConfig({
        ...valid,
        NODE_ENV: 'production',
        APP_ORIGIN: 'https://example.test',
        SERVE_WEB: 'true',
        TRUST_PROXY: '127.0.0.1,10.2.0.0/16',
      }),
    ).toMatchObject({
      serveWeb: true,
      trustProxy: ['127.0.0.1', '10.2.0.0/16'],
    });
  });

  it.each([
    { MONGODB_URI: undefined },
    { MONGODB_URI: 'mongodb://localhost:27018/easy_generator' },
    { MONGODB_URI: `${valid.MONGODB_URI}&directConnection=true` },
    { MONGODB_URI: `${valid.MONGODB_URI}&w=1` },
    { MONGODB_URI: `${valid.MONGODB_URI}&readConcernLevel=local` },
    { MONGODB_URI: `${valid.MONGODB_URI}&retryWrites=false` },
    { MONGODB_URI: 'mongodb://localhost:27018/?replicaSet=easy-generator-rs' },
    { APP_ORIGIN: 'http://localhost:5173/' },
    { APP_ORIGIN: 'http://localhost:5173/path' },
    { APP_ORIGIN: 'https://user:secret@example.test' },
    { APP_ORIGIN: 'http://example.test' },
    { NODE_ENV: 'production', SERVE_WEB: 'true' },
    {
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://example.test',
      SERVE_WEB: 'false',
    },
    { NODE_ENV: 'staging' },
    { PORT: '0' },
    { PORT: '65536' },
    { PORT: '3e3' },
    { SERVE_WEB: 'yes' },
    { TRUST_PROXY: 'true' },
    { TRUST_PROXY: '1' },
    { TRUST_PROXY: '0.0.0.0/0' },
    { TRUST_PROXY: 'example.test' },
  ])('rejects unsafe or incompatible configuration %#', (overrides) => {
    expect(() => validateRuntimeConfig({ ...valid, ...overrides })).toThrow();
  });

  it('does not include submitted configuration secrets in errors', () => {
    const secret = 'never-log-this-value';
    expect(() =>
      validateRuntimeConfig({ ...valid, MONGODB_URI: secret }),
    ).toThrow(
      'MONGODB_URI must name a database and replica set without policy overrides.',
    );
  });
});
