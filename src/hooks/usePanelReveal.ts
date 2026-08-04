import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { animationsDisabled, getMotionVersion, subscribeMotion } from '../utils/animations';

export type PanelStage = 'box' | 'title' | 'cards' | 'done';

const PANEL_STAGE_ORDER: PanelStage[] = ['box', 'title', 'cards', 'done'];

/**
 * Safety net, not choreography. If an element never reports — it was
 * display:none, its animation was interrupted, a browser dropped the event —
 * the stage advances anyway rather than leaving the panel half-revealed.
 * Deliberately far longer than any real stage, so it never wins a race with
 * the animation it is guarding.
 */
export const STALL_GUARD_MS = 2000;

export const panelStageIndex = (stage: PanelStage) => PANEL_STAGE_ORDER.indexOf(stage);

const nextStage = (stage: PanelStage): PanelStage =>
  PANEL_STAGE_ORDER[Math.min(panelStageIndex(stage) + 1, PANEL_STAGE_ORDER.length - 1)];

/**
 * Local (per-panel-instance) reveal sequence: the box wipes in, then the
 * panel's own title decodes, then its content dominoes in.
 *
 * Stages advance on *events*, not on elapsed time. Each stage ends when its
 * **lead** element reports — the first one to finish, not the last — so a
 * stage's tail overlaps the next one and the panel reads as a single machine
 * coming online rather than four separate beats. Nothing here knows any
 * duration: retuning a keyframe in animations.css needs no change in this
 * file. It used to hold a DURATIONS table hand-synced to the CSS, and both
 * entries had drifted roughly 2x — the title stage allowed 500ms for a decode
 * that takes ~1025ms, and the cards stage allowed 500ms for a stagger that
 * runs 950ms on a full shelf. See docs/adr/0006-event-driven-panel-reveal.md.
 *
 * Not global or once-per-session (unlike BootSequenceContext) — a fresh
 * timeline every time a panel mounts, gated behind `ready` so a panel never
 * starts revealing before the app has finished its own boot.
 *
 * `resetKey`: pass whatever identifies "this is a new panel" (e.g. the
 * category param) — same idea as React's own `key` prop. Without it, if the
 * surrounding component doesn't actually unmount between panels (a route
 * param changing without the route component remounting), this hook's state
 * would stay stuck at 'done' from the previous panel while a `key` elsewhere
 * in the JSX still forces the CSS animations to restart — the content ends up
 * "ready" and animating from the first frame instead of waiting its turn,
 * colliding with the still-in-progress box reveal.
 */
export const usePanelReveal = (
  ready: boolean,
  resetKey?: string | number,
  /**
   * Stages nothing will report. A panel with no decoded title has no reporter
   * for 'title'; one with no card domino has none for 'cards'. Those stages
   * advance on entry instead of waiting out the stall guard.
   *
   * This list is a to-do, not a fixture: as each surface gains a real Growth
   * or Domino element to report with, its entry here goes away.
   */
  unreported: PanelStage[] = [],
) => {
  const [stage, setStage] = useState<PanelStage>('box');

  /**
   * Toggling motion or asking for a replay bumps this, which restarts the
   * sequence exactly as a resetKey change would. Subscribing here rather than
   * at each call site is what makes the dev replay chord work on every panel
   * in the app without any of them knowing about it.
   */
  const motionVersion = useSyncExternalStore(subscribeMotion, getMotionVersion, getMotionVersion);

  /**
   * Which stage has already spent its advance. Without this latch every card
   * in a domino would push the sequence forward, and a twelve-card grid would
   * arrive at 'done' before its first card had landed.
   */
  const spent = useRef<PanelStage | null>(null);

  const advance = useCallback((from: PanelStage) => {
    if (spent.current === from) return;
    spent.current = from;
    setStage((current) => (current === from ? nextStage(current) : current));
  }, []);

  useEffect(() => {
    if (!ready) return;

    spent.current = null;

    if (animationsDisabled()) {
      setStage('done');
      return;
    }

    setStage('box');
  }, [ready, resetKey, motionVersion]);

  // Only the *dep* needs flattening — the array identity changes on every
  // render at most call sites, while its contents do not.
  const unreportedKey = unreported.join(',');
  const isUnreported = unreported.includes(stage);

  useEffect(() => {
    if (!ready || stage === 'done' || animationsDisabled()) return;
    if (!isUnreported) return;

    advance(stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unreportedKey stands in for `unreported`, whose identity is unstable.
  }, [ready, stage, advance, unreportedKey, isUnreported]);

  // One guard per stage, replaced as the sequence moves on.
  useEffect(() => {
    if (!ready || stage === 'done' || animationsDisabled()) return;

    const guard = window.setTimeout(() => advance(stage), STALL_GUARD_MS);
    return () => window.clearTimeout(guard);
  }, [ready, stage, advance]);

  return { stage, advance };
};
