import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { animationsDisabled, getMotionVersion, subscribeMotion } from '../utils/animations';
import {
  BOOT_STAGE_HOLDS,
  bootBorders,
  bootLines,
  bootNavItems,
  bootTriangles,
} from '../utils/bootMotion';

export type BootStage = 'lines' | 'triangles' | 'borders' | 'nav' | 'header' | 'done';

const STAGE_ORDER: BootStage[] = ['lines', 'triangles', 'borders', 'nav', 'header', 'done'];

/**
 * How long each stage holds before boot moves on, in seconds.
 *
 * These used to describe CSS keyframes in another file, which is the drift
 * ADR-0006 was written about. They describe nothing but themselves now: the
 * gestures live on this same timeline, so a stage's hold and the animation it
 * holds for are one object and cannot disagree. See `src/utils/bootMotion.ts`
 * for why the holds are deliberately not the same numbers as the tweens.
 */
const STAGE_HOLDS = BOOT_STAGE_HOLDS;

export const stageIndex = (stage: BootStage) => STAGE_ORDER.indexOf(stage);

interface BootSequenceContextType {
  stage: BootStage;
  skip: () => void;
}

const BootSequenceContext = createContext<BootSequenceContextType | undefined>(undefined);

/**
 * The boot sequence's clock.
 *
 * It used to be a `forEach` accumulating `elapsed` into five `setTimeout`s — a
 * timeline written longhand, holding exactly the durations-in-JS shape that
 * ADR-0006 banned one file over. That it is a real timeline now matters less
 * for boot's own animation than for what waits on it: every surface in the app
 * plays its entrance when this reaches `header`, and that handoff used to be a
 * race between this chain of timeouts and the browser's animation clock.
 * Nothing reconciled the two, and the panel reveal fell down the gap between
 * them — see docs/adr/0007-gsap-timelines-own-motion.md.
 *
 * The seam silences boot like anything else now. It was deliberately ungated
 * before, on the grounds that it sat outside the motion vocabulary's remit —
 * that reason is gone now that it is a timeline like any other, and a ~3.1s
 * animated boot is precisely what someone asking for reduced motion is asking
 * not to sit through. Disabled, the timeline jumps to the end, which fires
 * every stage callback in order and puts the page straight into its resting
 * state.
 */
export const BootSequenceProvider = ({ children }: { children: ReactNode }) => {
  const [stage, setStage] = useState<BootStage>('lines');
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const motionVersion = useSyncExternalStore(subscribeMotion, getMotionVersion, getMotionVersion);

  useGSAP(
    () => {
      setStage('lines');

      const next = gsap.timeline();

      /**
       * Each stage gets a label, its gesture is placed at that label, and the
       * hand-over to the next stage is placed a hold later. So the animation
       * and the moment the app is told about it are two things on one
       * timeline, rather than a keyframe in a stylesheet and a number in a
       * table that has to agree with it.
       *
       * A gesture is free to run past its own hold, and the triangle mesh
       * does: it is still painting itself in while the borders draw over it,
       * which is what makes boot read as one construction.
       */
      let at = 0;
      STAGE_ORDER.slice(0, -1).forEach((stageName) => {
        const hold = STAGE_HOLDS[stageName as Exclude<BootStage, 'done'>];
        next.addLabel(stageName, at);

        if (stageName === 'lines') bootLines(next, stageName);
        if (stageName === 'triangles') bootTriangles(next, stageName);
        if (stageName === 'borders') bootBorders(next, stageName);
        if (stageName === 'nav') bootNavItems(next, stageName);

        at += hold;
        next.call(() => setStage(STAGE_ORDER[stageIndex(stageName) + 1]), undefined, at);
      });

      timeline.current = next;

      // Not a separate branch: the same timeline, resolved instantly. Every
      // stage callback still fires in order, so the page lands on 'done'
      // rather than on whatever stage a short-circuit happened to leave it at.
      if (animationsDisabled()) next.progress(1);

      return () => {
        timeline.current = null;
      };
    },
    { dependencies: [motionVersion] },
  );

  /**
   * Skipping is seeking to the end, so it cannot disagree with playing all the
   * way through — the same callbacks fire in the same order. The old version
   * cleared five pending timeouts and set the state to 'done' directly, which
   * made "skipped" and "finished" two different paths to the same word.
   */
  const skip = () => {
    timeline.current?.progress(1);
  };

  useGSAP(
    () => {
      if (stage === 'done') return;

      const handleSkip = () => skip();
      window.addEventListener('click', handleSkip);
      window.addEventListener('keydown', handleSkip);

      return () => {
        window.removeEventListener('click', handleSkip);
        window.removeEventListener('keydown', handleSkip);
      };
    },
    { dependencies: [stage === 'done'] },
  );

  return (
    <BootSequenceContext.Provider value={{ stage, skip }}>
      {children}
    </BootSequenceContext.Provider>
  );
};

export const useBootSequence = () => {
  const context = useContext(BootSequenceContext);
  if (!context) {
    throw new Error('useBootSequence must be used within BootSequenceProvider');
  }
  return context;
};

/**
 * Tri-state view of a single stage's lifecycle, relative to the shared boot stage:
 * - active:    stage has reached (or passed) `trigger` — content should be visible
 * - animating: active, but boot isn't finished yet — apply the running CSS animation
 * - settled:   boot is fully done — render the final resting state, no animation
 *   (this also covers skip(), which seeks to the end from any earlier stage)
 */
export const useStageState = (trigger: BootStage) => {
  const { stage } = useBootSequence();
  const settled = stage === 'done';
  const active = settled || stageIndex(stage) >= stageIndex(trigger);
  return { active, animating: active && !settled, settled };
};

