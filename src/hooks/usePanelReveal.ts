import { useEffect, useState } from 'react';
import { animationsDisabled } from '../utils/animations';

export type PanelStage = 'box' | 'title' | 'cards' | 'done';

const PANEL_STAGE_ORDER: PanelStage[] = ['box', 'title', 'cards', 'done'];

const DURATIONS: Record<Exclude<PanelStage, 'done'>, number> = {
  box: 450,   // matches .nier-enter's own duration
  title: 500, // rough decode duration for a typical panel title
  cards: 500, // stagger window for the card grid
};

export const panelStageIndex = (stage: PanelStage) => PANEL_STAGE_ORDER.indexOf(stage);

/**
 * Local (per-panel-instance) reveal sequence: box expands in, then the
 * panel's own title decodes, then its content (e.g. a card grid) reveals.
 * Unlike BootSequenceContext this isn't global/once-per-session — it's a
 * fresh timeline every time a panel mounts (new category, revisiting a
 * page, etc.), gated behind `ready` (typically the boot sequence's own
 * 'header'-stage readiness, so a panel never starts revealing before the
 * app has finished its own boot).
 *
 * `resetKey`: pass whatever identifies "this is a new panel" (e.g. the
 * category param) — same idea as React's own `key` prop. Without it, if
 * the surrounding component doesn't actually unmount between panels (e.g.
 * a route param changing without the route component itself remounting),
 * this hook's state would stay stuck at 'done' from the previous panel,
 * while a `key` elsewhere in the JSX still forces the DOM/CSS animations
 * to restart fresh — the content ends up "ready" and animating in from
 * the very first frame instead of waiting its turn, colliding visually
 * with the still-in-progress box-reveal transform.
 */
export const usePanelReveal = (ready: boolean, resetKey?: string | number) => {
  const [stage, setStage] = useState<PanelStage>('box');

  useEffect(() => {
    if (!ready) return;

    if (animationsDisabled()) {
      setStage('done');
      return;
    }

    setStage('box');
    const toTitle = window.setTimeout(() => setStage('title'), DURATIONS.box);
    const toCards = window.setTimeout(() => setStage('cards'), DURATIONS.box + DURATIONS.title);
    const toDone = window.setTimeout(() => setStage('done'), DURATIONS.box + DURATIONS.title + DURATIONS.cards);

    return () => {
      window.clearTimeout(toTitle);
      window.clearTimeout(toCards);
      window.clearTimeout(toDone);
    };
  }, [ready, resetKey]);

  return stage;
};
