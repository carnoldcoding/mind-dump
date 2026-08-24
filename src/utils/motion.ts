/**
 * The motion primitives, as functions that add themselves to a timeline.
 *
 * These began as the five the boot sequence has always spoken — Wipe, Domino,
 * Growth, Decode, Fade — since joined by Ripple (ADR-0011); `docs/motion.md`
 * says which owns what. They were CSS classes until the panel layer moved onto
 * timelines; naming them here rather than letting each surface hand-write tweens
 * is what keeps a panel's wipe and a modal's wipe the same gesture.
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

/**
 * A timeline is built when its surface mounts, which for anything waiting on a
 * fetch is *before* the thing it addresses exists — a shelf's cards, a list's
 * sections. That build finds nothing, and `useRevealTimeline`'s `rebuildOn`
 * builds it again once the data lands. The empty first pass is the design
 * working, so GSAP's warning about it is noise on every page load.
 *
 * The cost of silencing it is real and worth stating: a genuine typo in a
 * selector now fails quietly. The check that catches those is that every
 * primitive is addressed by a `data-*` attribute this repo also writes, so a
 * mismatch is greppable.
 */
gsap.config({ nullTargetWarn: false });

type Target = gsap.TweenTarget;
type Position = gsap.Position;

/** Seconds. GSAP's unit, and now the only place these live. */
export const WIPE_DURATION = 0.32;
export const GROWTH_DURATION = 0.3;
export const DOMINO_DURATION = 0.35;
export const DOMINO_STAGGER = 0.03;
export const FADE_DURATION = 0.24;
export const RIPPLE_DURATION = 0.28;
export const RIPPLE_STAGGER = 0.035;
/** The gap between one leaf's beat and the next in a full-surface Cascade. */
export const REVEAL_STEP = 0.025;

/**
 * How long each character of a Decode takes. The lever for a reveal's overall
 * pacing: a panel's title is the longest beat in it, so a long title sets the
 * length of the whole sequence — about 1s for `CURRENT VIEW PANEL`.
 */
export const DECODE_PER_CHAR = 0.055;

/**
 * Why every primitive below is a `fromTo` with an explicit resting value, and
 * clears the properties it touched when it lands.
 *
 * `.from()` reads the element's *current* value as the destination it animates
 * towards. That is fine once, and wrong the second time: a rebuild — a shelf
 * filtering, a critique changing tab — runs over an element the previous build
 * left at `opacity: 0`, records 0 as the destination, and fades 0 to 0. The
 * prose on the detail page stuck invisible exactly this way, and so would
 * every Domino and Growth on a surface with `rebuildOn`. Wipe never did,
 * because it was already a `fromTo`.
 *
 * `clearProps` is the other half: an entrance that removes its own inline
 * styles when it finishes leaves the element in the state its stylesheet
 * describes, so nothing downstream — a hover transition, the next rebuild —
 * has to reason about residue an animation left behind.
 */

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
    { clipPath: 'inset(0 0% 0 0)', duration: WIPE_DURATION, ease: 'power2.inOut', clearProps: 'clipPath' },
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
  timeline.fromTo(
    target,
    { scaleX: 0, transformOrigin: origin },
    { scaleX: 1, duration: GROWTH_DURATION, ease: 'power2.out', clearProps: 'transform' },
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
  timeline.fromTo(
    target,
    { opacity: 0, y: -18 },
    {
      opacity: 1,
      y: 0,
      duration: DOMINO_DURATION,
      ease: 'back.out(1.4)',
      stagger,
      clearProps: 'opacity,transform',
    },
    position,
  );

/**
 * RIPPLE — a group filling in item by item in place: genre rows, the cells of a
 * segmented track. Staggered opacity and nothing else — no slide, which is the
 * whole line between this and Domino. A cell of a rating track is a fixed
 * segment; it should brighten where it stands, not fall into place.
 *
 * It is Domino with the translate removed, or Fade with a stagger added — the
 * other five name neither. Like Domino, the stagger is the point, so it is not
 * optional. `fromTo` for the same reason every primitive is: a rebuild must find
 * an explicit resting opacity to animate towards, not read the 0 the last build
 * left behind.
 */
export const ripple = (
  timeline: gsap.core.Timeline,
  target: Target,
  position?: Position,
  stagger = RIPPLE_STAGGER,
) =>
  timeline.fromTo(
    target,
    { opacity: 0 },
    { opacity: 1, duration: RIPPLE_DURATION, ease: 'power1.out', stagger, clearProps: 'opacity' },
    position,
  );

/** FADE — prose and fields. Anything that wraps, plus backdrops. */
export const fade = (timeline: gsap.core.Timeline, target: Target, position?: Position) =>
  timeline.fromTo(
    target,
    { opacity: 0 },
    { opacity: 1, duration: FADE_DURATION, ease: 'power1.out', clearProps: 'opacity' },
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
 * DECODE, as a group over a surface's section headers.
 *
 * The nested arrival grammar (ADR-0011) lands every section header — GENRE,
 * RATING, RELEASED — as one beat before any section body fills. Each header
 * decodes toward its *own* text, so this reads the labels off the DOM rather
 * than taking a list: a header is a Decode target because it carries
 * `data-section-header`, and a new section joins the group for free by carrying
 * the marker. Every header starts at the same `position`, which is what makes
 * the beat a group rather than a stagger.
 *
 * Scoped to `scope` so the mobile filter column — the same markup rendered a
 * second time inside a portalled Modal, outside this subtree — is not addressed
 * twice.
 */
/**
 * The tags a Cascade reads to pick a leaf's primitive, and the elements it
 * reveals whole rather than walking into.
 */
const ATOMIC_TAGS = new Set(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'SVG', 'IMG', 'CANVAS', 'A', 'LABEL']);

const hasDirectText = (el: Element): boolean =>
  Array.from(el.childNodes).some((node) => node.nodeType === 3 && (node.textContent ?? '').trim() !== '');

/**
 * A leaf is revealed as one beat; a wrapper is descended into. A node is a leaf
 * when it carries its own text, is an interactive or media element, is a marked
 * card, or has no element children — anything else is layout to walk through.
 */
const isRevealUnit = (el: Element): boolean =>
  el.matches('[data-shelf-card]') ||
  ATOMIC_TAGS.has(el.tagName) ||
  hasDirectText(el) ||
  el.children.length === 0;

const revealUnit = (timeline: gsap.core.Timeline, el: Element, position: number) => {
  if (el.matches('[data-hairline]')) return growth(timeline, el, position);
  if (el.matches('[data-panel-title], [data-page-title], [data-section-header]'))
    return decode(timeline, el, el.textContent ?? '', position);
  if (el.matches('[data-shelf-card]')) return domino(timeline, el, position);
  return ripple(timeline, el, position);
};

/**
 * CASCADE — a surface's whole content revealed in one sequence, so nothing
 * arrives un-animated (ADR-0012).
 *
 * It walks `root` in DOM order and gives every leaf its own beat at a running
 * position: a wrapper is descended into, a leaf is revealed with the primitive
 * its markers call for — a header or title Decodes, a hairline Grows, a card
 * falls in a Domino, everything else Ripples in place. The guarantee that
 * nothing pops is structural rather than a matter of hand-tagging: the walk
 * reaches every leaf, and a leaf with no tween is the only thing that can pop —
 * `.from()` hides on build, so a leaf that has a tween starts hidden.
 *
 * Skips the frame surfaces (their Wipe is a separate, stable timeline) and any
 * element the stylesheet has hidden, so a `lg:hidden` control does not spend a
 * beat on a viewport that never shows it. Returns the position after the last
 * beat.
 */
export const cascade = (
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  startPosition = 0,
  step = REVEAL_STEP,
): number => {
  let position = startPosition;
  const visit = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (child.matches('[data-panel-surface]')) continue;
      if (typeof window !== 'undefined' && window.getComputedStyle(child).display === 'none') continue;
      if (isRevealUnit(child)) {
        revealUnit(timeline, child, position);
        position += step;
      } else {
        visit(child);
      }
    }
  };
  visit(root);
  return position;
};

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
