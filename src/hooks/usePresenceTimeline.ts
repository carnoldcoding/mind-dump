import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { animationsDisabled, getMotionVersion, subscribeMotion } from '../utils/animations';

/**
 * An entrance that can also be played backwards, for a surface that comes and
 * goes rather than arriving once.
 *
 * The difference from `useRevealTimeline` is who decides when the element
 * leaves the DOM. A panel never leaves. A modal does, and every call site in
 * this app removed it the instant it closed — `{creating && <Modal/>}` — which
 * is why nothing in the app has ever animated out: a component the parent has
 * already unmounted has nothing left to animate.
 *
 * So this owns presence. `open` is the caller's intent; `present` is what the
 * caller should actually render. Closing plays the timeline in reverse and
 * only then drops `present`, so the exit happens before React is allowed to
 * take the element away.
 *
 * **Exit is the entrance reversed** — see docs/motion.md. There is no second
 * declaration for a departure, and so no way for the two to drift apart. Every
 * time a surface's motion has been declared twice in this repo, the two
 * disagreed: the frame and the shadow it cast desynced, and the stage
 * machine's duration table drifted ~2x from the CSS it was copied from.
 */
export const usePresenceTimeline = (
  open: boolean,
  build: (timeline: gsap.core.Timeline) => void,
  scope: RefObject<HTMLElement | null>,
) => {
  const [present, setPresent] = useState(open);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const motionVersion = useSyncExternalStore(subscribeMotion, getMotionVersion, getMotionVersion);

  const buildRef = useRef(build);
  buildRef.current = build;

  // Opening is immediate: the element has to exist before a timeline can be
  // built against it, and building it is what applies the hidden start state.
  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  useGSAP(
    () => {
      if (!present) return;

      const next = gsap.timeline({ paused: true });
      buildRef.current(next);
      timeline.current = next;

      if (animationsDisabled()) next.progress(1).pause();
      else next.play();

      return () => {
        timeline.current = null;
      };
    },
    { scope, dependencies: [present, motionVersion] },
  );

  useEffect(() => {
    if (open || !present) return;

    const current = timeline.current;

    // Nothing to play backwards, or nothing that should be: leave at once
    // rather than holding a closed dialog on screen waiting for an animation
    // that is never going to run.
    //
    // `progress() === 0` is the third case and the easy one to miss: a modal
    // closed before its entrance had a frame to run in is already at the start,
    // and GSAP does not fire onReverseComplete for a reversal with nowhere to
    // go — so waiting on that callback would strand a closed dialog on screen.
    if (!current || animationsDisabled() || current.progress() === 0) {
      setPresent(false);
      return;
    }

    current.eventCallback('onReverseComplete', () => setPresent(false));
    current.reverse();
  }, [open, present, motionVersion]);

  return present;
};
