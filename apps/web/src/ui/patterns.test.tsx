import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWaitUntil } from './patterns';

describe('useWaitUntil', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ends a wait once Date.now() reaches the deadline, even if its timer fires early', () => {
    // Timers and Date.now() use different clocks, so a timer can fire one
    // millisecond before the wall-clock deadline (observed on a CI runner).
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let wallClock = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => wallClock);
    const until = wallClock + 1000;
    const { result } = renderHook(() => useWaitUntil(until));
    expect(result.current).toBe(true);

    wallClock = until - 1;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(true);

    wallClock = until;
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it('waits out a deadline beyond the largest timer delay without spinning', () => {
    // setTimeout fires at once for a delay above 2^31 - 1 ms, so an
    // unbounded re-arm would wake every millisecond until the deadline.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const arm = vi.spyOn(globalThis, 'setTimeout');
    const waits = () =>
      arm.mock.calls.filter(([, delay]) => (delay ?? 0) > 60_000).length;
    const { result } = renderHook(() =>
      useWaitUntil(1_000_000 + 2 ** 31 + 60_000),
    );

    act(() => vi.advanceTimersByTime(1000));
    expect(waits()).toBe(1);
    // After one full step the next one is bounded too.
    act(() => vi.advanceTimersByTime(2 ** 31));
    expect(waits()).toBe(2);
    expect(result.current).toBe(true);
  });
});
