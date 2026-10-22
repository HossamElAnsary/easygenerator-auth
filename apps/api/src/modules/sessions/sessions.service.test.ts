import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DependencyUnavailableError } from '../../common/errors.js';
import { Clock } from '../../infrastructure/clock/clock.js';
import {
  type NewSession,
  SessionsRepository,
  type StoredSession,
} from './sessions.repository.js';
import { SESSION_LIFETIME_MS, SessionsService } from './sessions.service.js';

const NOW = new Date('2026-10-21T12:00:00.000Z');
const USER_ID = '6716a1f0c2b1d3e4f5a6b7c8';
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

class ManualClock extends Clock {
  current = NOW.getTime();

  override now(): Date {
    return new Date(this.current);
  }
}

/**
 * Keeps the port's contract: acknowledged writes, no expiry filtering of its
 * own, and `false` from a delete that removed nothing or was unacknowledged.
 */
class InMemorySessions extends SessionsRepository {
  readonly stored = new Map<string, StoredSession>();
  readonly calls: string[] = [];
  /** Simulates a delete whose acknowledgment was lost after it was applied. */
  loseNextDeleteAcknowledgment = false;
  /** Simulates a delete that was never applied and never acknowledged. */
  dropNextDelete = false;
  /** Runs while a lookup is in flight, before it resolves. */
  duringLookup: (() => void) | undefined;

  async insert(session: NewSession): Promise<void> {
    this.calls.push('insert');
    this.stored.set(session.tokenHash, {
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
  }

  async deleteByDigest(tokenHash: string): Promise<boolean> {
    this.calls.push('delete');
    if (this.dropNextDelete) {
      this.dropNextDelete = false;
      return false;
    }
    const deleted = this.stored.delete(tokenHash);
    if (this.loseNextDeleteAcknowledgment) {
      this.loseNextDeleteAcknowledgment = false;
      return false;
    }
    return deleted;
  }

  async findByDigest(tokenHash: string): Promise<StoredSession | null> {
    this.calls.push('find');
    this.duringLookup?.();
    return this.stored.get(tokenHash) ?? null;
  }
}

function setup() {
  const clock = new ManualClock();
  const sessions = new InMemorySessions();
  return { clock, sessions, service: new SessionsService(sessions, clock) };
}

const MALFORMED_TOKENS: readonly [string, unknown][] = [
  ['missing', undefined],
  ['not a string', 42],
  ['too short', 'abc'],
  // 43 characters, but the last one carries data bits a 32-byte token cannot.
  ['non-canonical ending', `${'A'.repeat(42)}B`],
];

describe('session policy', () => {
  it('stores only the token digest, with an expiry exactly one lifetime later', async () => {
    const { sessions, service } = setup();
    const issued = await service.issue(USER_ID);

    expect(issued.expiresAt.getTime()).toBe(
      NOW.getTime() + SESSION_LIFETIME_MS,
    );
    expect([...sessions.stored]).toEqual([
      [digest(issued.token), { userId: USER_ID, expiresAt: issued.expiresAt }],
    ]);
    expect(await service.findActiveUserId(issued.token)).toBe(USER_ID);
  });

  it.each(MALFORMED_TOKENS)(
    'rejects a %s token before any repository call',
    async (_case, token) => {
      const { sessions, service } = setup();
      expect(await service.findActiveUserId(token)).toBeNull();
      await expect(service.revoke(token)).resolves.toBeUndefined();
      expect(sessions.calls).toEqual([]);
    },
  );

  it('accepts a session until, but not at, its expiry instant', async () => {
    const { clock, service } = setup();
    const { token, expiresAt } = await service.issue(USER_ID);

    clock.current = expiresAt.getTime() - 1;
    expect(await service.findActiveUserId(token)).toBe(USER_ID);
    clock.current = expiresAt.getTime();
    expect(await service.findActiveUserId(token)).toBeNull();
  });

  it('judges expiry by the time after the lookup completes', async () => {
    const { clock, sessions, service } = setup();
    const { token, expiresAt } = await service.issue(USER_ID);

    clock.current = expiresAt.getTime() - 1;
    sessions.duringLookup = () => {
      clock.current = expiresAt.getTime();
    };
    expect(await service.findActiveUserId(token)).toBeNull();
  });

  it('confirms a revocation by its delete without a second read', async () => {
    const { sessions, service } = setup();
    const { token } = await service.issue(USER_ID);

    await service.revoke(token);
    expect(sessions.calls).toEqual(['insert', 'delete']);
    expect(await service.findActiveUserId(token)).toBeNull();
  });

  it('confirms absence when a delete was applied but not acknowledged', async () => {
    const { sessions, service } = setup();
    const { token } = await service.issue(USER_ID);
    sessions.loseNextDeleteAcknowledgment = true;

    await expect(service.revoke(token)).resolves.toBeUndefined();
    expect(sessions.calls).toEqual(['insert', 'delete', 'find']);
  });

  it('treats revoking an unknown well-formed token as done once absence is confirmed', async () => {
    const { sessions, service } = setup();
    const { token } = await service.issue(USER_ID);
    await service.revoke(token);
    sessions.calls.length = 0;

    await expect(service.revoke(token)).resolves.toBeUndefined();
    expect(sessions.calls).toEqual(['delete', 'find']);
  });

  it('reports a revocation it cannot confirm as unavailable', async () => {
    const { sessions, service } = setup();
    const { token } = await service.issue(USER_ID);
    sessions.dropNextDelete = true;

    await expect(service.revoke(token)).rejects.toBeInstanceOf(
      DependencyUnavailableError,
    );
    expect(await service.findActiveUserId(token)).toBe(USER_ID);
  });

  it('propagates a failed write instead of returning a token', async () => {
    const { sessions, service } = setup();
    sessions.insert = async () => {
      throw new DependencyUnavailableError();
    };

    await expect(service.issue(USER_ID)).rejects.toBeInstanceOf(
      DependencyUnavailableError,
    );
  });
});
