import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { DatabaseService } from './database.service.js';
import { StartupIndexes } from './startup-indexes.js';

/**
 * The MongoDB connection, its startup checks, and readiness. The connection
 * is created unopened; DatabaseService opens it with the fixed concern policy
 * before the application accepts traffic.
 *
 * Registered once by the composition root. It is global for the same reason
 * as @nestjs/mongoose's own core module: `MongooseModule.forFeature()` builds
 * its model providers in a module that imports nothing, so the connection
 * token must be resolvable application-wide.
 */
@Module({})
export class DatabaseModule {
  static forRoot(startupIndexes: Type<StartupIndexes>): DynamicModule {
    const connection = {
      provide: getConnectionToken(),
      useFactory: () => mongoose.createConnection(),
    };
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        connection,
        DatabaseService,
        { provide: StartupIndexes, useClass: startupIndexes },
      ],
      exports: [connection.provide, DatabaseService],
    };
  }
}
