/**
 * The motion primitives, as functions that add themselves to a timeline.
 *
 * These are the same five the boot sequence has always spoken — Wipe, Domino,
 * Growth, Decode, Fade — and `docs/motion.md` says which owns what. They were
 * CSS classes until the panel layer moved onto timelines; naming them here
 * rather than letting each surface hand-write tweens is what keeps a panel's
 * wipe and a modal's wipe the same gesture.
 *
 * Every one takes a `position`, GSAP's placement argument, so a caller says
 * where a beat sits relative to the ones before it. `"<0.2"` — start 200ms
 * after the previous tween *began* — is how stages overlap. The version this
 * replaced bought that overlap by ending each stage on its lead element, which
 * needed a reporting protocol, a spent latch and an escape list to express.
 */

import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

type Target = gsap.TweenTarget;
type Position = gsap.Position;

/** Seconds. GSAP's unit, and now the only place these live. */
export const WIPE_DURATION = 0.32;
export const GROWTH_DURATION = 0.3;
export const DOMINO_DURATION = 0.35;
export const DOMINO_STAGGER = 0.03;
export const FADE_DURATION = 0.24;

/**
 * How long each character of a Decode takes. The lever for a reveal's overall
 * pacing: a panel's title is the longest beat in it, so a long title sets the
 * length of the whole sequence — about 1s for `CURRENT VIEW PANEL`.
 */
export const DECODE_PER_CHAR = 0.055;

/**
 * WIPE — the entrance for every solid surface: panels, frames, modals.
 *
 * A hard clip edge sweeping left to right, at full opacity throughout. No fade
 * and no scale: both read as soft rather than geometric, and the translate-and-
 * scale entrance this replaced moved the surface on both axes at once, which is
 * what made a nominally horizontal slide look diagonal.
 *
 * `fromTo` rather than `from` because the resting state is `clip-path: none`,
 * which does not interpolate against an `inset()` — the tween has to be told
 * both ends.
 */
export const wipe = (timeline: gsap.core.Timeline, target: Target, position?: Position) =>
  timeline.fromTo(
    target,
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: WIPE_DURATION, ease: 'power2.inOut' },
    position,
  );

/**
 * GROWTH — horizontal bars, rules and dividers expanding from an anchored edge.
 * `origin` is the transform-origin; a right-anchored bar passes 'right center'.
 */
export const growth = (
  timeline: gsap.core.Timeline,
  target: Target,
  position?: Position,
  origin = 'left center',
) =>
  timeline.from(
    target,
    { scaleX: 0, transformOrigin: origin, duration: GROWTH_DURATION, ease: 'power2.out' },
    position,
  );

/**
 * DOMINO — anything arriving as a sequence: card grids, list rows, nav items.
 *
 * The stagger is the primitive's whole point, so it is not optional. `back.out`
 * carries the slight overshoot-and-settle the CSS keyframe drew by hand at 60%.
 */
export const domino = (
  timeline: gsap.core.Timeline,
  target: Target,
  position?: Position,
  stagger = DOMINO_STAGGER,
) =>
  timeline.from(
    target,
    {
      opacity: 0,
      y: -18,
      duration: DOMINO_DURATION,
      ease: 'back.out(1.4)',
      stagger,
    },
    position,
  );

/** FADE — prose and fields. Anything that wraps, plus backdrops. */
export const fade = (timeline: gsap.core.Timeline, target: Target, position?: Position) =>
  timeline.from(
    target,
    { opacity: 0, duration: FADE_DURATION, ease: 'power1.out' },
    position,
  );

/**
 * DECODE — glyph scramble locking left-to-right. Short uppercase chrome only:
 * page headers, panel titles, readout labels, nav labels. Never prose — it
 * rewrites every character continuously and is unreadable on a paragraph.
 *
 * The element must already contain its final text. The tween scrambles *toward*
 * what is there, which is why a disabled timeline resolving to `progress(1)`
 * leaves the real words behind with no special case. The hook this replaces
 * started from an empty string and drove a setInterval, so it could not report
 * into a timeline, could not be seeked, and did not check the motion flag at
 * all until shortly before it was deleted.
 */
export const decode = (
  timeline: gsap.core.Timeline,
  target: Target,
  text: string,
  position?: Position,
) =>
  timeline.to(
    target,
    {
      duration: Math.max(DECODE_PER_CHAR, text.length * DECODE_PER_CHAR),
      scrambleText: { text, chars: 'upperCase', speed: 0.6, revealDelay: 0 },
    },
    position,
  );

/**
 * A panel's frame and the shadow it casts, wiped as one tween over two targets.
 *
 * They were sibling elements gated by hand at every call site, and two of the
 * four sites gated them differently — the shadow animated in while the frame
 * was still invisible, so the shadow arrived before the thing casting it. One
 * tween is a stronger guarantee than the shared component was: there is no
 * second animation for the first one to disagree with.
 */
export const panelSurface = (timeline: gsap.core.Timeline, scope: string = '') =>
  wipe(timeline, `${scope} [data-panel-surface]`.trim());
