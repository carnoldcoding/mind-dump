import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { animationsDisabled, getMotionVersion, subscribeMotion } from '../utils/animations';

/**
 * A surface's entrance, as a timeline that is built now and played later.
 *
 * Two things happen at different times on purpose:
 *
 *   build  — at mount. `.from()` applies its start values the moment the tween
 *            is created, even on a paused timeline, so **building the timeline
 *            is what hides the surface**. There is no separate gate.
 *   play   — when `ready` turns true.
 *
 * That split is the whole fix for the reveal this replaced. It gated with
 * `visibility: hidden`, which does not stop a CSS animation — so a surface
 * that mounted before the boot sequence reached it had already run its wipe,
 * unseen, and could never run it again. An unplayed timeline cannot spend
 * itself. See docs/adr/0007-gsap-timelines-own-motion.md.
 *
 * `ready` is a latch, not an event: it flips true and stays true, so a surface
 * mounting *after* the boot sequence has passed it plays immediately rather
 * than waiting for a signal that already went by.
 *
 * When motion is off the timeline is still built, identically, and set to
 * `progress(1)`. The resting state cannot drift from the animated one because
 * the same declaration produces both — it used to be a separate branch in
 * three files, and one of them didn't check the flag at all.
 */
export const useRevealTimeline = (
  ready: boolean,
  build: (timeline: gsap.core.Timeline) => void,
  scope: RefObject<HTMLElement | null>,
) => {
  const timeline = useRef<gsap.core.Timeline | null>(null);

  /**
   * Toggling motion or asking for a replay bumps this, which rebuilds the
   * timeline from scratch. Subscribing here rather than at each call site is
   * what makes the dev chords reach every surface in the app without any of
   * them knowing the chords exist.
   */
  const motionVersion = useSyncExternalStore(subscribeMotion, getMotionVersion, getMotionVersion);

  /**
   * Held in a ref so a caller passing a fresh inline arrow every render — which
   * is every caller — doesn't rebuild a timeline that has already played.
   */
  const buildRef = useRef(build);
  buildRef.current = build;

  // Deliberately not keyed on `ready`: the timeline is built once and *played*
  // later. Rebuilding on the signal would re-apply every start value one frame
  // before playing them, which is the flash the old gate produced.
  useGSAP(
    () => {
      const next = gsap.timeline({ paused: true });
      buildRef.current(next);
      timeline.current = next;

      if (animationsDisabled()) next.progress(1).pause();

      return () => {
        timeline.current = null;
      };
    },
    { scope, dependencies: [motionVersion] },
  );

  // useGSAP runs in a layout effect, so the timeline exists by the time this
  // runs on the same commit.
  useEffect(() => {
    if (!ready || animationsDisabled()) return;
    timeline.current?.play();
  }, [ready, motionVersion]);

  return timeline;
};
