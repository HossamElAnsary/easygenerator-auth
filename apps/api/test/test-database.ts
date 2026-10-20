import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { DATABASE_CLIENT_OPTIONS } from '../src/database/database-options.js';

export function isolatedDatabase() {
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri)
    throw new Error(
      'Set MONGODB_TEST_URI from .env.example and run npm run db:ready.',
    );
  const options = new mongoose.mongo.MongoClient(uri).options;
  if (
    options.dbName !== 'easy_generator_test' ||
    !options.replicaSet ||
    options.directConnection
  ) {
    throw new Error(
      'Tests require the dedicated easy_generator_test replica-set URI.',
    );
  }
  if (process.env.MONGODB_URI) {
    const appOptions = new mongoose.mongo.MongoClient(process.env.MONGODB_URI)
      .options;
    if (appOptions.dbName === options.dbName)
      throw new Error('Test and application databases must differ.');
  }
  const name = `easy_generator_test_${randomUUID().replaceAll('-', '')}`;
  const isolatedUri = uri.replace(/\/easy_generator_test(?=\?|$)/, `/${name}`);
  if (isolatedUri === uri)
    throw new Error('Test URI must explicitly name its database.');
  const client = new mongoose.mongo.MongoClient(
    isolatedUri,
    DATABASE_CLIENT_OPTIONS,
  );
  return {
    name,
    uri: isolatedUri,
    client,
    async cleanup() {
      if (
        !/^easy_generator_test_[a-f0-9]{32}$/.test(name) ||
        client.options.dbName !== name
      ) {
        throw new Error('Refusing cleanup of an unowned database.');
      }
      try {
        await client.db(name).dropDatabase();
      } finally {
        await client.close();
      }
    },
  };
}
