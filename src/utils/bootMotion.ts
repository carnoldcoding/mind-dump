/**
 * The boot sequence's own choreography, as tweens.
 *
 * Kept apart from `motion.ts` because boot is not written in the five
 * primitives — it is where they came from. A triangle mesh panning in from
 * black is not a Wipe or a Domino, and forcing it into that vocabulary would
 * mean stretching the vocabulary rather than describing what boot does.
 *
 * What it *does* share is the mechanism: one timeline, which is the point of
 * moving it. Boot's stages used to advance on a duration table that described
 * keyframes in another file — the exact drift ADR-0006 was written about,
 * surviving in the one place still shaped the old way. A stage now hands over
 * at a position on the same timeline that carries the animation, so retuning a
 * gesture and retuning the sequence are one edit.
 *
 * Selectors are document-wide on purpose. There is exactly one boot sequence.
 */

import gsap from 'gsap';

/**
 * Same reason as `motion.ts`, and boot has its own version of it: the desktop
 * nav and the mobile header are never both mounted, so one of the two border
 * tweens always addresses nothing. Set here as well because this module is
 * reachable without `motion.ts` — a test that renders only boot loads one and
 * not the other.
 */
gsap.config({ nullTargetWarn: false });

/**
 * The mesh's shape. Each cell holds *two* polygons — the top-left triangle and
 * the bottom-right one — so the element count is twice the cell count, which
 * is the detail that makes a grid-based stagger the wrong tool here.
 */
export const TRIANGLE_ROWS = 12;
export const TRIANGLE_COLS = 20;
const TRIANGLES_PER_CELL = 2;

/** The original wave's step, per cell of Manhattan distance from the corner. */
const TRIANGLE_STEP = 0.018;
/** The second triangle in a cell lands just behind the first. */
const TRIANGLE_PAIR_OFFSET = 0.006;

/**
 * When each triangle starts, reproducing the wave exactly.
 *
 * `stagger.grid` was the obvious reach and is wrong twice over: it measures
 * Euclidean distance from the origin cell, which gives a circular front where
 * this has a straight diagonal one, and it would need a grid of [12, 40] to
 * account for two polygons per cell — at which point the column index no
 * longer means what the wave means by it.
 *
 * A stagger function says what the old inline delay said, in the same terms:
 * row plus column, one step each.
 */
export const triangleDelay = (index: number): number => {
  const cell = Math.floor(index / TRIANGLES_PER_CELL);
  const row = Math.floor(cell / TRIANGLE_COLS);
  const column = cell % TRIANGLE_COLS;
  const second = index % TRIANGLES_PER_CELL === 1;

  return (row + column) * TRIANGLE_STEP + (second ? TRIANGLE_PAIR_OFFSET : 0);
};

/**
 * Resting tones, as literals rather than `var(--color-nier-50)`. GSAP
 * interpolates colours, and it cannot interpolate towards a custom property it
 * has not resolved — a `var()` endpoint would snap rather than pan. Kept beside
 * the tween that needs them, and matching `src/index.css`.
 */
const NIER_50 = '#C6C2A5';
const NIER_100 = '#DBD5B3';

/**
 * Stage hand-over offsets, in seconds — how long after its own stage begins
 * boot moves on to the next.
 *
 * These are not durations and deliberately do not match the tweens: the
 * triangle mesh runs about 900ms against a 700ms hand-over, so it is still
 * panning in while the borders start drawing over it. That overlap is the
 * sequence reading as one construction rather than four separate beats, and it
 * is the reason these are their own numbers rather than derived from the
 * tweens. They describe choreography; the tweens describe gestures.
 */
const LINES_HOLD = 0.5;
const TRIANGLES_HOLD = 0.7;
const BORDERS_HOLD = 0.5;
const NAV_HOLD = 0.6;
/** Nothing of boot's own animates here — it is the room the page's header decode needs. */
const HEADER_HOLD = 0.8;

export const BOOT_STAGE_HOLDS = {
  lines: LINES_HOLD,
  triangles: TRIANGLES_HOLD,
  borders: BORDERS_HOLD,
  nav: NAV_HOLD,
  header: HEADER_HOLD,
};

/**
 * The four corner lines growing out from their anchors.
 *
 * Rotation is a tween property rather than the `--nier-line-rotate` custom
 * property the keyframe needed. A CSS keyframe animating `transform` has to
 * restate every component of it on every frame, which is why the angle had to
 * be threaded through a variable; GSAP tracks rotation and scaleX separately,
 * so the angle is set once and only the scale moves.
 */
export const bootLines = (timeline: gsap.core.Timeline, at: gsap.Position) =>
  timeline.fromTo(
    '[data-boot-line]',
    { scaleX: 0, opacity: 0 },
    {
      scaleX: 1,
      opacity: 1,
      duration: LINES_HOLD,
      ease: 'power1.inOut',
      clearProps: 'opacity',
    },
    at,
  );

/**
 * The triangle mesh painting itself in from black, tile by tile on the
 * diagonal.
 *
 * The wave used to be an inline `animation-delay` of `(row + col) * 18ms` on
 * every one of 480 polygons, computed in the component and written into the
 * DOM. It is a stagger function now — the same arithmetic, declared once,
 * with nothing written into the markup. See `triangleDelay` for why this is
 * not `stagger.grid`.
 *
 * The 1.05 scale bump and the pass through the lighter tone are the keyframe's
 * own shape, kept: the tile overshoots very slightly as it lands, so the mesh
 * reads as being placed rather than faded up.
 */
export const bootTriangles = (timeline: gsap.core.Timeline, at: gsap.Position) =>
  timeline.fromTo(
    '[data-boot-triangle]',
    { fill: '#000000', scale: 1 },
    {
      duration: 0.35,
      ease: 'power2.out',
      keyframes: [
        { fill: NIER_100, scale: 1.05, duration: 0.19 },
        { fill: NIER_50, scale: 1, duration: 0.16 },
      ],
      stagger: (index: number) => triangleDelay(index),
    },
    at,
  );

/**
 * The nav bar and the footer drawing in as one frame, from opposite ends —
 * the top left-to-right, the bottom right-to-left. Two clip directions rather
 * than the two near-identical keyframes they needed as CSS.
 */
export const bootBorders = (timeline: gsap.core.Timeline, at: gsap.Position) => {
  timeline.fromTo(
    '[data-boot-border]',
    { clipPath: 'inset(0 100% 0 0)' },
    {
      clipPath: 'inset(0 0% 0 0)',
      duration: BORDERS_HOLD,
      ease: 'power1.inOut',
      clearProps: 'clipPath',
    },
    at,
  );

  return timeline.fromTo(
    '[data-boot-border-reverse]',
    { clipPath: 'inset(0 0 0 100%)' },
    {
      clipPath: 'inset(0 0 0 0%)',
      duration: BORDERS_HOLD,
      ease: 'power1.inOut',
      clearProps: 'clipPath',
    },
    at,
  );
};

/**
 * The nav items arriving one after another.
 *
 * Addressed as the bar's own children. NavTab forwards only `className` and
 * `style`, and teaching it to spread arbitrary props so it could carry a
 * `data-` marker would be a change to a component for the benefit of an
 * animation that can already reach it.
 */
export const bootNavItems = (timeline: gsap.core.Timeline, at: gsap.Position) =>
  timeline.fromTo(
    '[data-boot-border] > *',
    { opacity: 0, y: -6 },
    {
      opacity: 1,
      y: 0,
      duration: 0.25,
      ease: 'power1.out',
      stagger: 0.08,
      clearProps: 'opacity,transform',
    },
    at,
  );
