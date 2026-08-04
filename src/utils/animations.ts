/**
 * The single motion seam. Everything that animates asks here whether it may,
 * rather than reading the env var (or the media query) for itself.
 *
 * Three inputs, in precedence order:
 *
 *   1. the runtime override — the dev toggle, and the only thing a user acts on
 *   2. `prefers-reduced-motion` — a standing preference from the OS
 *   3. `VITE_DISABLE_ANIMATIONS` — the build-time default (see docs/motion.md)
 *
 * The override outranks the media query on purpose: it exists so you can turn
 * motion *on* to look at it, and a machine set to reduce motion would
 * otherwise make that impossible.
 */

export type MotionOverride = 'on' | 'off';

let override: MotionOverride | null = null;

/**
 * Bumped on every override change and every replay. Panels subscribe to it and
 * use it as a reveal reset key, so toggling motion or asking for a replay
 * restarts the sequence without a reload.
 */
let version = 0;

const listeners = new Set<() => void>();

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const envDisabled = (): boolean => import.meta.env.VITE_DISABLE_ANIMATIONS === 'true';

// Guarded because jsdom provides no matchMedia — under test the preference is
// simply absent unless a test installs one.
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const animationsDisabled = (): boolean => {
  if (override !== null) return override === 'off';
  return envDisabled() || prefersReducedMotion();
};

export const enterClass = (className: string): string =>
  animationsDisabled() ? '' : className;

export const setMotionOverride = (next: MotionOverride | null): void => {
  override = next;
  emit();
};

export const resetMotionOverride = (): void => {
  override = null;
  emit();
};

export const toggleMotion = (): void => {
  setMotionOverride(animationsDisabled() ? 'on' : 'off');
};

/** Restart every mounted panel's reveal in place. */
export const replayReveal = (): void => {
  emit();
};

export const subscribeMotion = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getMotionVersion = (): number => version;
