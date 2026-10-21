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
});
