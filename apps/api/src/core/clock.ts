import { Injectable } from '@nestjs/common';

/** Server time, injected so session expiry can be tested without waiting. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
