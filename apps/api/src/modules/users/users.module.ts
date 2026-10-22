import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, userSchema } from './user.schema.js';
import { MongoUsersRepository } from './users.mongo-repository.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: USER_MODEL, schema: userSchema }]),
  ],
  providers: [{ provide: UsersRepository, useClass: MongoUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
