import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STALL_GUARD_MS, usePanelReveal } from './usePanelReveal';
import { replayReveal, resetMotionOverride } from '../utils/animations';

describe('usePanelReveal', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    resetMotionOverride();
  });

  it('advances a stage when its lead element finishes animating', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true));
    expect(result.current.stage).toBe('box');

    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('title');

    act(() => result.current.advance('title'));
    expect(result.current.stage).toBe('cards');

    act(() => result.current.advance('cards'));
    expect(result.current.stage).toBe('done');
  });

  it('advances on the FIRST element only, so a domino tail cannot skip a stage', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true));
    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('title');

    // Three more cards report in from the stage we already left.
    act(() => {
      result.current.advance('box');
      result.current.advance('box');
      result.current.advance('box');
    });

    expect(result.current.stage).toBe('title');
  });

  it('ignores a report from a stage that is no longer current', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true));
    act(() => result.current.advance('cards'));

    expect(result.current.stage).toBe('box');
  });

  it('does not advance past done', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true));
    act(() => result.current.advance('box'));
    act(() => result.current.advance('title'));
    act(() => result.current.advance('cards'));
    expect(result.current.stage).toBe('done');

    act(() => result.current.advance('done'));
    expect(result.current.stage).toBe('done');
  });

  it('force-advances if an element never reports, so the chain cannot stall', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    vi.useFakeTimers();

    const { result } = renderHook(() => usePanelReveal(true));
    expect(result.current.stage).toBe('box');

    act(() => { vi.advanceTimersByTime(STALL_GUARD_MS); });
    expect(result.current.stage).toBe('title');
  });

  it('jumps straight to done with no pending timers when animations are disabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    const { result } = renderHook(() => usePanelReveal(true));

    expect(result.current.stage).toBe('done');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('stays at box until ready becomes true, disabled or not', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    const { result } = renderHook(() => usePanelReveal(false));
    expect(result.current.stage).toBe('box');
  });

  it('restarts the sequence when resetKey changes', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => usePanelReveal(true, key),
      { initialProps: { key: 'games' } },
    );

    act(() => result.current.advance('box'));
    act(() => result.current.advance('title'));
    expect(result.current.stage).toBe('cards');

    rerender({ key: 'cinema' });
    expect(result.current.stage).toBe('box');
  });

  it('advances an unreported stage on entry instead of waiting out the guard', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true, undefined, ['title', 'cards']));

    // 'box' still waits for the frame's wipe...
    expect(result.current.stage).toBe('box');

    // ...but title and cards, which nothing reports, fall straight through.
    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('done');
  });

  it('leaves reported stages alone when others are unreported', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true, undefined, ['cards']));

    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('title');
  });

  it('restarts the sequence when a replay is requested, without a resetKey', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result } = renderHook(() => usePanelReveal(true));
    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('title');

    act(() => { replayReveal(); });

    expect(result.current.stage).toBe('box');
  });

  it('accepts a fresh report from a stage it has already left and re-entered', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => usePanelReveal(true, key),
      { initialProps: { key: 'games' } },
    );

    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('title');

    rerender({ key: 'cinema' });
    expect(result.current.stage).toBe('box');

    // The per-stage latch must have been cleared by the reset, or the new
    // panel would sit at 'box' forever waiting for a report it already spent.
    act(() => result.current.advance('box'));
    expect(result.current.stage).toBe('title');
  });
});
