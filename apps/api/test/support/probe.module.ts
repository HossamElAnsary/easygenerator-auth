import type { PublicUser } from '@easy-generator/contracts';
import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../src/auth/current-user.decorator.js';
import { Public } from '../../src/auth/public.decorator.js';

/** Counts handler invocations, so tests can prove a rejected request never ran. */
@Injectable()
export class ProbeRecorder {
  calls = 0;
}

// Test-only handlers: kept under test/ so production builds cannot expose them.
@Controller('test-probe')
class ProbeController {
  constructor(
    @Inject(ProbeRecorder) private readonly recorder: ProbeRecorder,
  ) {}

  @Public()
  @Post('echo')
  echo(@Body() body: unknown): { received: unknown } {
    this.recorder.calls += 1;
    return { received: body };
  }

  /** No public marker: proves new handlers require a session by default. */
  @Get('private')
  whoAmI(@CurrentUser() user: PublicUser): { user: PublicUser } {
    this.recorder.calls += 1;
    return { user };
  }
}

@Module({ controllers: [ProbeController], providers: [ProbeRecorder] })
export class ProbeModule {}
