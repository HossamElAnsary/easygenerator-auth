import { isIP } from 'node:net';
import mongoose from 'mongoose';
import { z } from 'zod';

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000'),
  MONGODB_URI: z.string().min(1),
  APP_ORIGIN: z.string().min(1),
  SERVE_WEB: z.enum(['true', 'false']).default('false'),
  TRUST_PROXY: z.string().default('false'),
});

export interface RuntimeConfig {
  mode: 'development' | 'test' | 'production';
  port: number;
  mongodbUri: string;
  replicaSet: string;
  appOrigin: string;
  serveWeb: boolean;
  trustProxy: false | string[];
}

function trustedAddresses(value: string): false | string[] {
  if (value === 'false') return false;
  const addresses = value.split(',').map((address) => address.trim());
  for (const address of addresses) {
    const parts = address.split('/');
    const family = isIP(parts[0] ?? '');
    const prefix = parts[1];
    if (
      !family ||
      parts.length > 2 ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) ||
          Number(prefix) < 1 ||
          Number(prefix) > (family === 4 ? 32 : 128)))
    ) {
      throw new Error(
        'Invalid TRUST_PROXY: use explicit IP addresses or subnets.',
      );
    }
  }
  return addresses;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const result = environmentSchema.safeParse(env);
  if (!result.success)
    throw new Error('Invalid or missing runtime configuration.');
  const values = result.data;
  const port = Number(values.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid PORT.');

  let origin: URL;
  try {
    origin = new URL(values.APP_ORIGIN);
  } catch {
    throw new Error('Invalid APP_ORIGIN.');
  }
  if (
    origin.origin !== values.APP_ORIGIN ||
    origin.username ||
    origin.password ||
    !['http:', 'https:'].includes(origin.protocol) ||
    (values.NODE_ENV === 'production' && origin.protocol !== 'https:') ||
    (origin.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))
  ) {
    throw new Error(
      'APP_ORIGIN must be an exact origin; production requires HTTPS.',
    );
  }

  let replicaSet: string;
  try {
    // Parse with the actual pinned driver, including mongodb+srv/multi-host URIs.
    const client = new mongoose.mongo.MongoClient(values.MONGODB_URI);
    const options = client.options;
    if (!options.replicaSet || options.directConnection || options.loadBalanced)
      throw new Error();
    const query = new URLSearchParams(values.MONGODB_URI.split('?')[1] ?? '');
    const fixedPolicy = new Set([
      'readpreference',
      'readconcernlevel',
      'w',
      'journal',
      'j',
      'wtimeoutms',
      'retrywrites',
      'serverselectiontimeoutms',
      'sockettimeoutms',
      'timeoutms',
    ]);
    if ([...query.keys()].some((key) => fixedPolicy.has(key.toLowerCase())))
      throw new Error();
    if (!options.dbName || options.dbName === 'test') throw new Error();
    replicaSet = options.replicaSet;
  } catch {
    throw new Error(
      'MONGODB_URI must name a database and replica set without policy overrides.',
    );
  }

  if (values.NODE_ENV === 'production' && values.SERVE_WEB !== 'true') {
    throw new Error('Production requires SERVE_WEB=true.');
  }
  return {
    mode: values.NODE_ENV,
    port,
    mongodbUri: values.MONGODB_URI,
    replicaSet,
    appOrigin: values.APP_ORIGIN,
    serveWeb: values.SERVE_WEB === 'true',
    trustProxy: trustedAddresses(values.TRUST_PROXY),
  };
}
