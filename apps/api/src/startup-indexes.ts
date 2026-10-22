import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ensureIndexes } from './infrastructure/database/indexes.js';
import { StartupIndexes } from './infrastructure/database/startup-indexes.js';
import { SESSION_INDEXES } from './modules/sessions/index.js';
import { USER_INDEXES } from './modules/users/index.js';

/**
 * Every collection's required indexes. Lives in the composition root because
 * only it may know every module (Engineering E02).
 */
@Injectable()
export class RequiredIndexes extends StartupIndexes {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  async verify(): Promise<void> {
    for (const { collection, indexes } of [USER_INDEXES, SESSION_INDEXES]) {
      await ensureIndexes(this.connection.collection(collection), indexes);
    }
  }
}
