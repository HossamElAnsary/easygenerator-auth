import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SESSION_MODEL, sessionSchema } from './session.schema.js';
import { MongoSessionsRepository } from './sessions.mongo-repository.js';
import { SessionsRepository } from './sessions.repository.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SESSION_MODEL, schema: sessionSchema }]),
  ],
  providers: [
    SessionsService,
    { provide: SessionsRepository, useClass: MongoSessionsRepository },
  ],
  exports: [SessionsService],
})
export class SessionsModule {}
