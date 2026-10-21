import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/index.js';
import { UsersModule } from '../users/index.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';
import { PasswordHasher } from './password-hasher.js';
import { SessionCookie } from './session-cookie.js';

@Module({
  imports: [UsersModule, SessionsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionCookie,
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
  ],
  // SessionGuard is registered application-wide in AppModule.
  exports: [AuthService, SessionCookie],
})
export class AuthModule {}
