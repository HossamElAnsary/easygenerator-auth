import { describe, expect, it } from 'vitest';
import { validateRuntimeConfig } from './runtime-config.js';

const valid = {
  NODE_ENV: 'development',
  MONGODB_URI:
    'mongodb://localhost:27018/easy_generator?replicaSet=easy-generator-rs',
  APP_ORIGIN: 'http://localhost:5173',
};

// The listener binds 127.0.0.1, so production traffic arrives from a reverse
// proxy on the same host.
const production = {
  ...valid,
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://example.test',
  SERVE_WEB: 'true',
  TRUST_PROXY: '127.0.0.1',
};

describe('runtime configuration', () => {
  it('uses safe defaults and accepts explicit production ingress', () => {
    expect(validateRuntimeConfig(valid)).toMatchObject({
      port: 3000,
      serveWeb: false,
      trustProxy: false,
    });
    expect(
      validateRuntimeConfig({ ...valid, APP_ORIGIN: 'https://localhost:5173' }),
    ).toMatchObject({ appOrigin: 'https://localhost:5173' });
    expect(
      validateRuntimeConfig({
        ...production,
        TRUST_PROXY: '127.0.0.1,10.2.0.0/16',
      }),
    ).toMatchObject({
      serveWeb: true,
      trustProxy: ['127.0.0.1', '10.2.0.0/16'],
    });
    expect(
      validateRuntimeConfig({ ...production, TRUST_PROXY: '127.0.0.0/8' }),
    ).toMatchObject({ trustProxy: ['127.0.0.0/8'] });
  });

  it.each([undefined, 'false', '10.2.0.0/16', '::1'])(
    'refuses production unless TRUST_PROXY covers the same-host proxy (%s)',
    (TRUST_PROXY) => {
      expect(() =>
        validateRuntimeConfig({ ...production, TRUST_PROXY }),
      ).toThrow('Production requires TRUST_PROXY to include 127.0.0.1');
    },
  );

  it.each(['development', 'test'])(
    'refuses a non-loopback origin in %s mode, where cookies are not Secure',
    (NODE_ENV) => {
      expect(() =>
        validateRuntimeConfig({
          ...valid,
          NODE_ENV,
          APP_ORIGIN: 'https://app.example.test',
        }),
      ).toThrow('APP_ORIGIN must be an exact origin');
    },
  );

  it.each([
    { MONGODB_URI: undefined },
    { MONGODB_URI: 'mongodb://localhost:27018/easy_generator' },
    { MONGODB_URI: `${valid.MONGODB_URI}&directConnection=true` },
    { MONGODB_URI: `${valid.MONGODB_URI}&w=1` },
    { MONGODB_URI: `${valid.MONGODB_URI}&readConcernLevel=local` },
    { MONGODB_URI: `${valid.MONGODB_URI}&retryWrites=false` },
    // The pinned driver lets the deprecated alias override wtimeoutMS.
    { MONGODB_URI: `${valid.MONGODB_URI}&wtimeout=1` },
    { MONGODB_URI: `${valid.MONGODB_URI}&WTimeout=1` },
    { MONGODB_URI: `${valid.MONGODB_URI}&retryReads=false` },
    { MONGODB_URI: `${valid.MONGODB_URI}&connectTimeoutMS=1` },
    { MONGODB_URI: `${valid.MONGODB_URI}&waitQueueTimeoutMS=1` },
    { MONGODB_URI: `${valid.MONGODB_URI}&readPreferenceTags=dc:a` },
    { MONGODB_URI: `${valid.MONGODB_URI}&maxStalenessSeconds=120` },
    { MONGODB_URI: 'mongodb://localhost:27018/?replicaSet=easy-generator-rs' },
    { APP_ORIGIN: 'http://localhost:5173/' },
    { APP_ORIGIN: 'http://localhost:5173/path' },
    { APP_ORIGIN: 'https://user:secret@example.test' },
    { APP_ORIGIN: 'http://example.test' },
    { ...production, APP_ORIGIN: 'http://localhost:5173' },
    { ...production, SERVE_WEB: 'false' },
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
