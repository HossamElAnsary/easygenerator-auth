import { Injectable } from '@nestjs/common';
import type { ApiErrorCode } from '@easy-generator/contracts';

/**
 * Every field is a fixed, safe scalar. There is deliberately no free-form
 * payload: request bodies, emails, passwords, hashes, tokens, cookies, and
 * driver messages must never reach the logs (Architecture A07).
 */
export interface LogRecord {
  event: 'http_request' | 'dependency_unavailable' | 'unexpected_error';
  requestId?: string;
  method?: string;
  route?: string | null;
  status?: number;
  durationMs?: number;
  code?: ApiErrorCode;
  errorType?: string;
  driverCode?: number;
}

@Injectable()
export class AppLogger {
  info(record: LogRecord): void {
    this.emit('info', record);
  }

  error(record: LogRecord): void {
    this.emit('error', record);
  }

  protected emit(level: 'info' | 'error', record: LogRecord): void {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      ...record,
    });
    (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
  }
}
