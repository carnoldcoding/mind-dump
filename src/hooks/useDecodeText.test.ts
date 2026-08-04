import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDecodeText } from './useDecodeText';
import { resetMotionOverride } from '../utils/animations';

describe('useDecodeText', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    resetMotionOverride();
  });

  it('renders nothing until ready', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const { result } = renderHook(() => useDecodeText('CURRENT', false));
    expect(result.current).toBe('');
  });

  it('scrambles before it settles, then lands on the real text', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    vi.useFakeTimers();

    const { result } = renderHook(() => useDecodeText('CURRENT', true));

    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toHaveLength('CURRENT'.length);
    expect(result.current).not.toBe('CURRENT');

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe('CURRENT');
  });

  it('resolves instantly with no scramble when motion is disabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    const { result } = renderHook(() => useDecodeText('CURRENT', true));

    expect(result.current).toBe('CURRENT');
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('reports completion once the last character locks', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    vi.useFakeTimers();
    const onDone = vi.fn();

    renderHook(() => useDecodeText('CURRENT', true, onDone));

    expect(onDone).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports completion immediately when motion is disabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    const onDone = vi.fn();

    renderHook(() => useDecodeText('CURRENT', true, onDone));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not report completion while still unready', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const onDone = vi.fn();

    renderHook(() => useDecodeText('CURRENT', false, onDone));

    expect(onDone).not.toHaveBeenCalled();
  });

  it('does not restart the scramble when only the callback identity changes', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useDecodeText('CURRENT', true, cb),
      { initialProps: { cb: () => {} } },
    );

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe('CURRENT');

    // A parent re-rendering with a fresh inline arrow must not re-scramble a
    // title that has already settled.
    rerender({ cb: () => {} });
    expect(result.current).toBe('CURRENT');
  });
});
