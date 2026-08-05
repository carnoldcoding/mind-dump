import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMotionDevChords } from './useMotionDevChords';
import { animationsDisabled, getMotionVersion, resetMotionOverride } from '../utils/animations';

const press = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }));
};

describe('useMotionDevChords', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMotionOverride();
  });

  it('toggles motion on Ctrl+Alt+M', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    renderHook(() => useMotionDevChords());

    expect(animationsDisabled()).toBe(false);
    press('m', { ctrlKey: true, altKey: true });
    expect(animationsDisabled()).toBe(true);
  });

  it('bumps the motion version on Ctrl+Alt+R so panels replay', () => {
    renderHook(() => useMotionDevChords());
    const before = getMotionVersion();

    press('r', { ctrlKey: true, altKey: true });

    expect(getMotionVersion()).toBeGreaterThan(before);
  });

  it('ignores the key without both modifiers', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    renderHook(() => useMotionDevChords());

    press('m');
    press('m', { ctrlKey: true });
    press('m', { altKey: true });

    expect(animationsDisabled()).toBe(false);
  });

  it('leaves Ctrl+Alt with any other key alone', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    renderHook(() => useMotionDevChords());

    press('k', { ctrlKey: true, altKey: true });

    expect(animationsDisabled()).toBe(false);
  });

  it('stops listening once unmounted', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const { unmount } = renderHook(() => useMotionDevChords());
    unmount();

    press('m', { ctrlKey: true, altKey: true });

    expect(animationsDisabled()).toBe(false);
  });
});
