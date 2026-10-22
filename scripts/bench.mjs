// Local load baseline (Verification T19, Delivery M9). Starts the compiled API
// in production mode as its own process against a throwaway database, runs the
// endpoint and concurrency matrix with rate limits enabled, prints Markdown
// tables, and drops only the database it created.
//
//   npm run bench -- [--duration 10] [--levels 1,4,16,64] [--threadpool N]
//
// The load is closed-loop: each of N connections sends its next request only
// after the previous response, over a keep-alive socket.
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { Agent, createServer, request } from 'node:http';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import mongoose from 'mongoose';

const ORIGIN = 'https://bench.example.test';
const COOKIE = '__Host-session';
const PASSWORD = 'Analytical1!';
const SEEDED_ACCOUNTS = 64;
const LOGOUTS_PER_LEVEL = 2000;
const READ_SAMPLES = 200;
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

const options = parseArguments(process.argv.slice(2));
const write = (line = '') => process.stdout.write(`${line}\n`);

function parseArguments(argv) {
  const parsed = {
    duration: 10,
    levels: [1, 4, 16, 64],
    threadpool: undefined,
  };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value = ''] = [argv[index], argv[index + 1]];
    if (flag === '--duration') parsed.duration = Number(value);
    else if (flag === '--levels') parsed.levels = value.split(',').map(Number);
    else if (flag === '--threadpool') parsed.threadpool = Number(value);
    else throw new Error(`Unknown option ${flag}`);
  }
  const valid = (n) => Number.isInteger(n) && n > 0;
  if (!valid(parsed.duration) || !parsed.levels.every(valid))
    throw new Error('Durations and levels must be positive integers.');
  if (parsed.threadpool !== undefined && !valid(parsed.threadpool))
    throw new Error('--threadpool must be a positive integer.');
  return parsed;
}

// Every request gets its own client address through the trusted loopback
// proxy setting, as the test harness does, so per-IP limits stay enabled
// without every request sharing one bucket.
let clientCounter = 0;
function nextClient() {
  clientCounter += 1;
  return `10.${(clientCounter >> 16) & 255}.${(clientCounter >> 8) & 255}.${clientCounter & 255}`;
}

/**
 * A database of our own beside the test database; only it is ever dropped.
 * Mirrors the test harness's guard (apps/api/test/test-database.ts).
 */
function benchDatabaseUri() {
  const uri = process.env.MONGODB_TEST_URI ?? '';
  const parsed = new mongoose.mongo.MongoClient(uri).options;
  if (
    parsed.dbName !== 'easy_generator_test' ||
    !parsed.replicaSet ||
    parsed.directConnection
  )
    throw new Error('Set MONGODB_TEST_URI from .env.example first.');
  const name = `easy_generator_bench_${randomBytes(6).toString('hex')}`;
  const benchUri = uri.replace('/easy_generator_test?', `/${name}?`);
  if (
    benchUri === uri ||
    new mongoose.mongo.MongoClient(benchUri).options.dbName !== name
  )
    throw new Error(
      'MONGODB_TEST_URI must name easy_generator_test literally.',
    );
  return { name, uri: benchUri };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/** One request with the API's required mutation headers; resolves on the full body. */
function send(port, agent, method, path, { body, cookie } = {}) {
  const headers = {
    origin: ORIGIN,
    'x-forwarded-for': nextClient(),
    ...(method === 'POST'
      ? { 'content-type': 'application/json', 'x-csrf-protection': '1' }
      : {}),
    ...(cookie ? { cookie: `${COOKIE}=${cookie}` } : {}),
  };
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, method, path, headers, agent },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, text }),
        );
      },
    );
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

async function startApi(port, uri) {
  const env = {
    PATH: process.env.PATH,
    NODE_ENV: 'production',
    PORT: String(port),
    MONGODB_URI: uri,
    APP_ORIGIN: ORIGIN,
    SERVE_WEB: 'true',
    TRUST_PROXY: '127.0.0.1',
    ...(options.threadpool
      ? { UV_THREADPOOL_SIZE: String(options.threadpool) }
      : {}),
  };
  const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
    env,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (api.exitCode !== null)
      throw new Error('The API exited during startup.');
    const ready = await send(port, undefined, 'GET', '/api/health').catch(
      () => undefined,
    );
    if (ready?.status === 200) return api;
    await delay(200);
  }
  api.kill('SIGTERM');
  throw new Error('The API did not become ready within 30 s.');
}

const hasExited = (child) =>
  child.exitCode !== null || child.signalCode !== null;

async function stopApi(api) {
  if (hasExited(api)) return;
  const exited = new Promise((resolve) => api.once('exit', resolve));
  api.kill('SIGTERM');
  // Unreferenced, so a prompt exit does not leave the timer holding the process.
  await Promise.race([exited, delay(10_000, undefined, { ref: false })]);
  if (!hasExited(api)) api.kill('SIGKILL');
}

async function seed(port, client, databaseName) {
  const accounts = [];
  for (let index = 0; index < SEEDED_ACCOUNTS; index += 1) {
    const email = `seed-${index}@bench.example.test`;
    const signup = await send(port, undefined, 'POST', '/api/auth/signup', {
      body: { email, name: `Seed ${index}`, password: PASSWORD },
    });
    if (signup.status !== 201)
      throw new Error(`Seeding signup got ${signup.status}.`);
    const signin = await send(port, undefined, 'POST', '/api/auth/signin', {
      body: { email, password: PASSWORD },
    });
    const cookie = /__Host-session=([^;]+)/.exec(
      String(signin.headers['set-cookie']),
    )?.[1];
    if (signin.status !== 200 || !cookie)
      throw new Error('Seeding signin failed.');
    accounts.push({ email, id: JSON.parse(signup.text).user.id, cookie });
  }
  // Logout needs a fresh session per request; inserting them directly keeps
  // seeding fast. Only the SHA-256 digest is stored, as the API does.
  const now = new Date();
  const logoutTokens = [];
  const records = [];
  const total = LOGOUTS_PER_LEVEL * options.levels.length;
  for (let index = 0; index < total; index += 1) {
    const token = randomBytes(32).toString('base64url');
    logoutTokens.push(token);
    records.push({
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: new mongoose.Types.ObjectId(accounts[index % accounts.length].id),
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
    });
  }
  await client.db(databaseName).collection('sessions').insertMany(records);
  return { accounts, logoutTokens };
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return NaN;
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(fraction * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)];
}

function summarize(latencies, statuses, seconds) {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    rps: latencies.length / seconds,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    // Latency covers every response; flag rows where any was not a success,
    // so a fast 429 or 503 cannot read as a fast endpoint.
    statuses:
      Object.entries(statuses)
        .map(([status, count]) => `${status}×${count}`)
        .join(' ') +
      (Object.keys(statuses).some((status) => !/^2\d\d$/.test(status))
        ? ' (not all successful)'
        : ''),
  };
}

/** Closed-loop load: `connections` workers, each one request at a time. */
async function load(port, connections, scenario) {
  const agent = new Agent({ keepAlive: true, maxSockets: connections });
  const latencies = [];
  const statuses = {};
  const started = performance.now();
  const deadline = started + options.duration * 1000;
  let remaining = scenario.amount ?? Infinity;
  const more = () =>
    scenario.amount ? remaining-- > 0 : performance.now() < deadline;
  const worker = async () => {
    while (more()) {
      const input = scenario.next();
      const sent = performance.now();
      try {
        const { status } = await send(
          port,
          agent,
          scenario.method,
          scenario.path,
          input,
        );
        statuses[status] = (statuses[status] ?? 0) + 1;
        latencies.push(performance.now() - sent);
      } catch {
        // A failed socket produces no response; count it visibly.
        statuses.errors = (statuses.errors ?? 0) + 1;
      }
    }
  };
  await Promise.all(Array.from({ length: connections }, worker));
  const seconds = (performance.now() - started) / 1000;
  agent.destroy();
  return summarize(latencies, statuses, seconds);
}

function scenarios(seeded) {
  let signups = 0;
  let signins = 0;
  let checks = 0;
  let logouts = 0;
  const { accounts, logoutTokens } = seeded;
  return {
    signup: {
      method: 'POST',
      path: '/api/auth/signup',
      next: () => ({
        body: {
          email: `load-${signups++}-${randomBytes(3).toString('hex')}@bench.example.test`,
          name: 'Load Test',
          password: PASSWORD,
        },
      }),
    },
    signin: {
      method: 'POST',
      path: '/api/auth/signin',
      next: () => ({
        body: {
          email: accounts[signins++ % accounts.length].email,
          password: PASSWORD,
        },
      }),
    },
    me: {
      method: 'GET',
      path: '/api/auth/me',
      next: () => ({ cookie: accounts[checks++ % accounts.length].cookie }),
    },
    logout: {
      method: 'POST',
      path: '/api/auth/logout',
      amount: LOGOUTS_PER_LEVEL,
      next: () => ({ body: {}, cookie: logoutTokens[logouts++] }),
    },
  };
}

/** Direct driver timings of the session lookup under each read concern. */
async function readConcernProbe(client, databaseName, tokenHash) {
  const sessions = client.db(databaseName).collection('sessions');
  const rows = [];
  for (const level of ['linearizable', 'majority', 'local']) {
    const times = [];
    for (let index = 0; index < READ_SAMPLES; index += 1) {
      const started = performance.now();
      await sessions.findOne(
        { tokenHash },
        { readConcern: { level }, readPreference: 'primary', maxTimeMS: 5000 },
      );
      times.push(performance.now() - started);
    }
    rows.push({ level, ...summarize(times, {}, 1) });
  }
  return rows;
}

function environment(serverVersion, journalCommitInterval) {
  const git = (...args) => execFileSync('git', args).toString().trim();
  const dirty = git('status', '--porcelain')
    ? ' (with uncommitted changes)'
    : '';
  const cpus = os.cpus();
  return [
    `- Commit: ${git('rev-parse', '--short', 'HEAD')}${dirty}`,
    `- Machine: ${cpus[0]?.model ?? 'unknown CPU'}, ${cpus.length} logical CPUs, ${Math.round(os.totalmem() / 2 ** 30)} GiB`,
    `- OS: ${os.type()} ${os.release()} (${os.arch()})`,
    `- Node: ${process.version}; MongoDB: ${serverVersion}; journalCommitInterval: ${journalCommitInterval ?? 'unavailable'} ms`,
    `- UV_THREADPOOL_SIZE: ${options.threadpool ?? 'default (4)'}`,
    `- Per run: ${options.duration} s (logout: ${LOGOUTS_PER_LEVEL} requests); connections: ${options.levels.join(', ')}`,
  ];
}

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '–');

async function main() {
  const database = benchDatabaseUri();
  const client = new mongoose.mongo.MongoClient(database.uri);
  await client.connect();
  let api;
  try {
    const port = await freePort();
    api = await startApi(port, database.uri);
    const seeded = await seed(port, client, database.name);
    const admin = client.db().admin();
    const build = await admin.command({ buildInfo: 1 });
    const journal = await admin
      .command({ getParameter: 1, journalCommitInterval: 1 })
      .catch(() => ({}));

    write('## Environment');
    write();
    for (const line of environment(
      build.version,
      journal.journalCommitInterval,
    ))
      write(line);
    write();
    write('## Endpoints');
    write();
    write(
      '| Endpoint | Connections | Requests/s | p50 ms | p95 ms | p99 ms | Statuses |',
    );
    write('| --- | ---: | ---: | ---: | ---: | ---: | --- |');
    const plan = scenarios(seeded);
    const healthRows = [];
    for (const name of ['signup', 'signin', 'me', 'logout']) {
      for (const connections of options.levels) {
        const running = load(port, connections, plan[name]);
        // Health shares the API with signin's hashing; its latency shows
        // whether hashing work delays unrelated requests.
        const health =
          name === 'signin'
            ? load(port, 1, {
                method: 'GET',
                path: '/api/health',
                next: () => ({}),
              })
            : undefined;
        const row = await running;
        if (health) healthRows.push({ connections, ...(await health) });
        write(
          `| ${name} | ${connections} | ${fmt(row.rps)} | ${fmt(row.p50)} | ${fmt(row.p95)} | ${fmt(row.p99)} | ${row.statuses} |`,
        );
      }
    }
    write();
    write('## /api/health while signin is under load (1 connection)');
    write();
    write('| Signin connections | p50 ms | p95 ms | p99 ms | Statuses |');
    write('| ---: | ---: | ---: | ---: | --- |');
    for (const row of healthRows)
      write(
        `| ${row.connections} | ${fmt(row.p50)} | ${fmt(row.p95)} | ${fmt(row.p99)} | ${row.statuses} |`,
      );
    write();
    write(
      `## Session lookup by read concern (direct driver, ${READ_SAMPLES} sequential reads)`,
    );
    write();
    write('| Read concern | p50 ms | p95 ms | p99 ms |');
    write('| --- | ---: | ---: | ---: |');
    // A live session: the seeded signins are never logged out.
    const sample = createHash('sha256')
      .update(seeded.accounts[0].cookie)
      .digest('hex');
    for (const row of await readConcernProbe(client, database.name, sample))
      write(
        `| ${row.level} | ${fmt(row.p50)} | ${fmt(row.p95)} | ${fmt(row.p99)} |`,
      );
  } finally {
    if (api) await stopApi(api);
    await client
      .db()
      .dropDatabase()
      .catch(() => undefined);
    await client.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Benchmark failed: ${error.message}\n`);
  process.exitCode = 1;
});
