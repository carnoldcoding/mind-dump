import { afterEach, describe, expect, it } from 'vitest';
import gsap from 'gsap';
import { cascade, ripple } from './motion';

/**
 * The primitives are seeked, not ticked: a paused timeline set to a fixed
 * `progress` applies that frame synchronously, so these read deterministic
 * values without a ticker. See docs/motion.md, "Tests seek, they do not tick".
 */

const makeItems = (count: number): HTMLElement[] =>
  Array.from({ length: count }, () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
  });

const tweensOf = (tl: gsap.core.Timeline) => tl.getChildren(false, true, false);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Ripple', () => {
  it('staggers opacity across items — earlier items lead', () => {
    const items = makeItems(4);
    const tl = gsap.timeline({ paused: true });
    ripple(tl, items);

    // A frame partway in: with a per-item stagger the first item is further
    // along its fade than the last. A non-staggered Fade would move them in
    // lockstep and this would be an equality.
    tl.progress(0.35);
    const first = Number(gsap.getProperty(items[0], 'opacity'));
    const last = Number(gsap.getProperty(items[3], 'opacity'));
    expect(first).toBeGreaterThan(last);
  });

  it('is opacity only — it never transforms the item, unlike Domino', () => {
    const items = makeItems(3);
    const tl = gsap.timeline({ paused: true });
    ripple(tl, items);

    tl.progress(0.35);
    // Domino slides on y; Ripple must not. y stays at its resting 0.
    expect(Number(gsap.getProperty(items[0], 'y'))).toBe(0);
  });

  it('lands every item fully opaque', () => {
    const items = makeItems(3);
    const tl = gsap.timeline({ paused: true });
    ripple(tl, items);

    tl.progress(1);
    for (const item of items) {
      expect(Number(gsap.getProperty(item, 'opacity'))).toBe(1);
    }
  });
});

/**
 * Cascade is the guarantee that nothing arrives un-animated: it walks a subtree
 * and gives every leaf a beat. These hold that guarantee (a tween per leaf, none
 * skipped bar the frame surfaces) and the primitive it picks per leaf.
 */
describe('cascade', () => {
  const build = (html: string): HTMLElement => {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };

  it('gives every leaf a beat, so nothing is left un-tweened', () => {
    // A long list (over the coalesce threshold) so the ul is walked into rather
    // than revealed whole; the section div holds a header, so it is walked too.
    const rows = Array.from({ length: 10 }, (_, i) => `<li>row${i}</li>`).join('');
    const root = build(`<div><h2 data-section-header>Genre</h2><ul>${rows}</ul></div><p>caption</p>`);
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root);

    // Coverage is per element, not per tween — a header gets two beats (a Fade
    // and a Decode). The twelve leaves (the h2, the ten li, the p) are each
    // touched; the wrapping div and ul are walked through, not revealed as units.
    const covered = new Set(tweensOf(tl).flatMap((t) => t.targets() as Element[]));
    expect(covered.size).toBe(12);
  });

  it('coalesces a small compound into one beat rather than its parts', () => {
    // A labelled field — a wrapper, a label, an input — is three nodes that
    // should arrive together, so the wrapper is revealed whole, not walked into.
    const root = build('<div class="field"><label>Name</label><input /></div>');
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root);

    const covered = new Set(tweensOf(tl).flatMap((t) => t.targets() as Element[]));
    expect(covered.size).toBe(1);
    expect([...covered][0]).toBe(root.querySelector('.field'));
  });

  it('reveals a run of sibling leaves in DOM order, each beat after the last', () => {
    const root = build('<span>a</span><span>b</span><span>c</span>');
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root, 0);

    const starts = tweensOf(tl).map((t) => t.startTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(3);
  });

  it('overlaps sibling components — the next starts before the previous finishes', () => {
    // Two sub-trees, each over the coalesce threshold so they are walked into.
    // The first is long enough that its span outruns BRANCH_STEP.
    const many = (p: string) => Array.from({ length: 10 }, (_, i) => `<i>${p}${i}</i>`).join('');
    const root = build(`<div>${many('a')}</div><div>${many('b')}</div>`);
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root, 0);

    const startOf = (el: Element) =>
      tweensOf(tl).find((t) => (t.targets() as Element[])[0] === el)!.startTime();
    const a10 = root.querySelectorAll('div:first-child i')[9];
    const b1 = root.querySelectorAll('div:last-child i')[0];
    // The second component's first beat lands before the first component's last —
    // they run concurrently rather than one-then-the-other.
    expect(startOf(b1)).toBeLessThan(startOf(a10));
  });

  it('hides a header on build so it does not sit visible before its beat', () => {
    const root = build('<h2 data-section-header>Genre</h2>');
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root, 0);

    // Decode alone is a .to() and would leave the header showing its real text
    // from build; the Fade at the same beat hides it until the cascade reaches it.
    expect(Number(gsap.getProperty(root.querySelector('[data-section-header]'), 'opacity'))).toBe(0);
  });

  it('skips the frame surfaces — their Wipe is a separate timeline', () => {
    const root = build('<article data-panel-surface><span>x</span></article><p>y</p>');
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root);

    // The data-panel-surface element is skipped whole, its child with it; only
    // the <p> outside it gets a beat.
    expect(tweensOf(tl).length).toBe(1);
  });

  it('decodes a section header toward its own text', () => {
    const root = build('<h2 data-section-header>Rating</h2>');
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root);

    tl.progress(1);
    expect(root.querySelector('[data-section-header]')?.textContent).toBe('Rating');
  });

  it('slides a card on y but leaves a plain leaf on opacity only', () => {
    const root = build('<div data-shelf-card>card</div><p>text</p>');
    const tl = gsap.timeline({ paused: true });
    cascade(tl, root);

    tl.progress(0.3);
    const card = root.querySelector('[data-shelf-card]')!;
    const plain = root.querySelector('p')!;
    // The card falls in a Domino (moves on y); the plain leaf Ripples (never
    // transforms).
    expect(Number(gsap.getProperty(card, 'y'))).not.toBe(0);
    expect(Number(gsap.getProperty(plain, 'y'))).toBe(0);
  });
});
