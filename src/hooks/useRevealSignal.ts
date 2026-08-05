import { useStageState, type BootStage } from '../context/BootSequenceContext';

/** The boot stage at which a page's own surfaces may begin revealing. */
export const REVEAL_STAGE: BootStage = 'header';

/**
 * The signal every surface's entrance waits on.
 *
 * A latch, not an event: it turns true and stays true, so a surface that mounts
 * after boot has already passed `header` — a panel whose fetch was slow — plays
 * at once rather than waiting for something that has already gone by. Pass it
 * straight to `useRevealTimeline`.
 *
 * It lives here rather than beside the boot stages so that file exports only
 * its Provider and the two hooks that read it; a hook is what this is, and
 * `src/hooks` is where the rest of them are.
 */
export const useRevealSignal = (): boolean => useStageState(REVEAL_STAGE).active;
