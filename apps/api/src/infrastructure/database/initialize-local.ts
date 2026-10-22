import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import {
  DATABASE_BUDGET_MS,
  DATABASE_CLIENT_OPTIONS,
} from './database-options.js';

const localUris = [
  'mongodb://localhost:27018/easy_generator?replicaSet=easy-generator-rs',
  'mongodb://localhost:27018/easy_generator_test?replicaSet=easy-generator-rs',
];

async function initializeLocal(): Promise<void> {
  const uri = process.argv.includes('--test')
    ? process.env.MONGODB_TEST_URI
    : process.env.MONGODB_URI;
  if (
    process.env.NODE_ENV === 'production' ||
    !uri ||
    !localUris.includes(uri)
  ) {
    throw new Error('Use the local development/test URI from .env.example.');
  }

  const root = fileURLToPath(new URL('../../../../../', import.meta.url));
  // A fresh container on a small CI runner can be slow both to start mongod
  // and to start each mongosh probe, so allow for both before giving up.
  const deadline = Date.now() + 60_000;
  let reachable = false;
  while (Date.now() < deadline) {
    const probe = spawnSync(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        'mongodb',
        'mongosh',
        '--quiet',
        '--port',
        '27018',
        '--eval',
        'quit(db.adminCommand({ping:1}).ok === 1 ? 0 : 1)',
      ],
      { cwd: root, stdio: 'ignore', timeout: 15_000 },
    );
    if (probe.status === 0) {
      reachable = true;
      break;
    }
    await delay(250);
  }
  if (!reachable)
    throw new Error('The local MongoDB process is not reachable.');
  const result = spawnSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'mongodb',
      'mongosh',
      '--quiet',
      '--port',
      '27018',
      '--file',
      '/opt/easy-generator/mongo-init.js',
    ],
    { cwd: root, stdio: 'inherit', timeout: 40_000 },
  );
  if (result.status !== 0 || result.error) {
    throw new Error(
      'Start the project database with docker compose up -d mongodb first.',
    );
  }

  // No directConnection override: the host must discover the advertised member.
  const client = new mongoose.mongo.MongoClient(uri, DATABASE_CLIENT_OPTIONS);
  try {
    await client.connect();
    const hello = await client
      .db('admin')
      .command({ hello: 1 }, { timeoutMS: DATABASE_BUDGET_MS });
    if (
      hello.setName !== 'easy-generator-rs' ||
      hello.isWritablePrimary !== true
    ) {
      throw new Error('Expected a writable local replica-set primary.');
    }
    console.info('Host replica-set discovery is ready.');
  } finally {
    await client.close();
  }
}

initializeLocal().catch(() => {
  console.error(
    'Local database initialization failed. Check Docker and the local .env settings.',
  );
  process.exitCode = 1;
});
