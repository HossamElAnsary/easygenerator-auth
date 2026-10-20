import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from '../config/runtime-config.js';
import { DATABASE_OPTIONS } from './database-options.js';
import { StartupIndexes } from './startup-indexes.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private indexesReady = false;

  constructor(
    @InjectConnection() readonly connection: Connection,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    @Inject(StartupIndexes) private readonly indexes: StartupIndexes,
  ) {}

  async initialize(): Promise<void> {
    try {
      this.connection.set('maxTimeMS', 5000);
      await this.connection.openUri(this.config.mongodbUri, DATABASE_OPTIONS);
      if (!(await this.hasWritablePrimary())) throw new Error();
      await this.indexes.verify();
      this.indexesReady = true;
    } catch {
      await this.connection.close().catch(() => undefined);
      throw new Error('Database startup checks failed.');
    }
  }

  private async hasWritablePrimary(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) return false;
    const hello = await this.connection.db
      .admin()
      .command({ hello: 1 }, { timeoutMS: 5000 });
    return (
      hello.isWritablePrimary === true &&
      hello.setName === this.config.replicaSet
    );
  }

  async isReady(): Promise<boolean> {
    try {
      return this.indexesReady && (await this.hasWritablePrimary());
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.indexesReady = false;
    await this.connection.close();
  }
}
