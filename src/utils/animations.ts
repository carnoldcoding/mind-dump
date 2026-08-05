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

import { useSyncExternalStore } from 'react';

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
  syncMotionClass();
  listeners.forEach((listener) => listener());
};

/**
 * Response — hover, focus, selection, press — is CSS transitions rather than
 * timelines, because interruption is the whole problem there and the browser
 * resolves it natively from whatever the current computed value happens to be.
 * So it cannot be silenced by building a timeline and seeking it; the seam
 * marks the document instead, and one rule in animations.css does the rest.
 *
 * There are 93 of these across 31 files, and until this class existed not one
 * of them was gated: only the vocabulary consulted this module, so a machine
 * set to `prefers-reduced-motion: reduce` still got every hover transition in
 * the app. That was a correctness bug rather than a coverage gap.
 */
const MOTION_OFF_CLASS = 'motion-off';

export const syncMotionClass = (): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(MOTION_OFF_CLASS, animationsDisabled());
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

/**
 * `enterClass` for components, and the one to reach for in a component.
 *
 * The plain function reads the seam once at render time and never hears about
 * it again, so flipping the dev toggle left every modal on whatever it had
 * already rendered until something unrelated re-rendered it. Subscribing here
 * is what makes the toggle reach the whole app rather than only the panels.
 */
export const useEnterClass = (className: string): string => {
  useSyncExternalStore(subscribeMotion, getMotionVersion, getMotionVersion);
  return enterClass(className);
};

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

/**
 * The preference can change while the page is open — a system-wide toggle, not
 * just a startup setting — so the seam listens rather than reading once. The
 * initial call is what marks the document on first load, before anything has
 * had a reason to emit.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window
    .matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', () => emit());
}

syncMotionClass();
