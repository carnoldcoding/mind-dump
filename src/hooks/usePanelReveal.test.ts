import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePanelReveal } from './usePanelReveal';

describe('usePanelReveal', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('stages through box -> title -> cards -> done over time when animations are enabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    vi.useFakeTimers();

    const { result } = renderHook(() => usePanelReveal(true));
    expect(result.current).toBe('box');

    act(() => { vi.advanceTimersByTime(450); });
    expect(result.current).toBe('title');

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('cards');

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('done');
  });

  it('jumps straight to done with no pending timers when animations are disabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    const { result } = renderHook(() => usePanelReveal(true));

    expect(result.current).toBe('done');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('stays at box until ready becomes true, disabled or not', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    const { result } = renderHook(() => usePanelReveal(false));
    expect(result.current).toBe('box');
  });
});
