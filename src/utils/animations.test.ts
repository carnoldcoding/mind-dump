import { afterEach, describe, expect, it, vi } from 'vitest';
import { animationsDisabled, enterClass } from './animations';

describe('animationsDisabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
});

describe('enterClass', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
