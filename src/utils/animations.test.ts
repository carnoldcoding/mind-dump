import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  animationsDisabled,
  enterClass,
  getMotionVersion,
  replayReveal,
  resetMotionOverride,
  setMotionOverride,
  subscribeMotion,
  toggleMotion,
} from './animations';

/**
 * jsdom has no matchMedia, so the reduced-motion branch is absent unless a
 * test installs one. That is also why the original env-only cases below
 * still hold unchanged.
 */
const stubMatchMedia = (matches: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('animationsDisabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetMotionOverride();
  });

  it('is false when VITE_DISABLE_ANIMATIONS is unset', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    expect(animationsDisabled()).toBe(false);
  });

  it('is true when VITE_DISABLE_ANIMATIONS is "true"', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    expect(animationsDisabled()).toBe(true);
  });

  it('is false for any other value', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'yes');
    expect(animationsDisabled()).toBe(false);
  });

  it('is true when the user prefers reduced motion, even with the env var unset', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    stubMatchMedia(true);
    expect(animationsDisabled()).toBe(true);
  });

  it('is false when the user has no reduced-motion preference', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    stubMatchMedia(false);
    expect(animationsDisabled()).toBe(false);
  });
});

describe('the runtime override', () => {
  beforeEach(() => {
    resetMotionOverride();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetMotionOverride();
  });

  it('turns motion on despite the env var disabling it', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    setMotionOverride('on');
    expect(animationsDisabled()).toBe(false);
  });

  it('turns motion off despite the env var allowing it', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    setMotionOverride('off');
    expect(animationsDisabled()).toBe(true);
  });

  it('outranks a reduced-motion preference, so the toggle always wins', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    stubMatchMedia(true);
    setMotionOverride('on');
    expect(animationsDisabled()).toBe(false);
  });

  it('falls back to the env var once reset', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    setMotionOverride('on');
    resetMotionOverride();
    expect(animationsDisabled()).toBe(true);
  });

  it('flips the current state when toggled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    expect(animationsDisabled()).toBe(false);
    toggleMotion();
    expect(animationsDisabled()).toBe(true);
    toggleMotion();
    expect(animationsDisabled()).toBe(false);
  });
});

describe('motion subscribers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMotionOverride();
  });

  it('bumps the version and notifies on override change', () => {
    const listener = vi.fn();
    const before = getMotionVersion();

    const unsubscribe = subscribeMotion(listener);
    setMotionOverride('off');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getMotionVersion()).toBeGreaterThan(before);
    unsubscribe();
  });

  it('bumps the version on replay so panels remount their reveal', () => {
    const before = getMotionVersion();
    replayReveal();
    expect(getMotionVersion()).toBeGreaterThan(before);
  });

  it('stops notifying once unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMotion(listener);
    unsubscribe();

    setMotionOverride('off');

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('enterClass', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMotionOverride();
  });

  it('returns the class name unchanged when animations are enabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    expect(enterClass('nier-enter')).toBe('nier-enter');
  });

  it('returns an empty string when animations are disabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    expect(enterClass('nier-enter')).toBe('');
  });
});
