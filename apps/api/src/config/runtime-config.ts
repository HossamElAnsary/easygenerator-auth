import { BlockList, isIP } from 'node:net';
import mongoose from 'mongoose';
import { z } from 'zod';

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');

/**
 * The API accepts connections only on loopback, so in production every request
 * arrives through a reverse proxy on the same host (Architecture A02/A07).
 */
export const LISTEN_HOST = '127.0.0.1';

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

/** Whether the trusted list covers LISTEN_HOST, the only peer the API sees. */
function trustsSameHostProxy(addresses: false | string[]): boolean {
  if (!addresses) return false;
  const trusted = new BlockList();
  for (const address of addresses) {
    const [ip = '', prefix] = address.split('/');
    const family = isIP(ip) === 4 ? 'ipv4' : 'ipv6';
    if (prefix === undefined) trusted.addAddress(ip, family);
    else trusted.addSubnet(ip, Number(prefix), family);
  }
  return trusted.check(LISTEN_HOST, 'ipv4');
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
    // Only production issues Secure cookies and HSTS, so every other mode
    // serves a loopback origin.
    (values.NODE_ENV === 'production'
      ? origin.protocol !== 'https:'
      : !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))
  ) {
    throw new Error(
      'APP_ORIGIN must be an exact origin: loopback outside production, HTTPS in production.',
    );
  }

  let replicaSet: string;
  try {
    // Checked before the driver parses the URI, so a rejected deprecated
    // option cannot make it print a warning.
    const query = new URLSearchParams(values.MONGODB_URI.split('?')[1] ?? '');
    const fixedPolicy = new Set([
      'readpreference',
      'readpreferencetags',
      'maxstalenessseconds',
      'readconcernlevel',
      'w',
      'journal',
      'j',
      'wtimeoutms',
      // Deprecated alias; the pinned driver lets it override wtimeoutMS.
      'wtimeout',
      'retrywrites',
      'retryreads',
      'serverselectiontimeoutms',
      'connecttimeoutms',
      'sockettimeoutms',
      'waitqueuetimeoutms',
      'timeoutms',
    ]);
    if ([...query.keys()].some((key) => fixedPolicy.has(key.toLowerCase())))
      throw new Error();
    // Parse with the actual pinned driver, including mongodb+srv/multi-host URIs.
    const options = new mongoose.mongo.MongoClient(values.MONGODB_URI).options;
    if (!options.replicaSet || options.directConnection || options.loadBalanced)
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
  const trustProxy = trustedAddresses(values.TRUST_PROXY);
  // Without trusting the same-host proxy, every client shares the proxy's
  // address, so each per-IP rate limit becomes one global bucket.
  if (values.NODE_ENV === 'production' && !trustsSameHostProxy(trustProxy)) {
    throw new Error(
      `Production requires TRUST_PROXY to include ${LISTEN_HOST}, the reverse proxy in front of the loopback listener.`,
    );
  }
  return {
    mode: values.NODE_ENV,
    port,
    mongodbUri: values.MONGODB_URI,
    replicaSet,
    appOrigin: values.APP_ORIGIN,
    serveWeb: values.SERVE_WEB === 'true',
    trustProxy,
  };
}
