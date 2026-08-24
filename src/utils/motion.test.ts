import { afterEach, describe, expect, it } from 'vitest';
import gsap from 'gsap';
import { decodeGroup, ripple } from './motion';

const headersIn = (scope: HTMLElement) =>
  scope.querySelectorAll<HTMLElement>('[data-section-header]');

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

describe('decodeGroup', () => {
  const makeScope = (labels: string[]): HTMLElement => {
    const scope = document.createElement('div');
    for (const label of labels) {
      const h = document.createElement('h2');
      h.setAttribute('data-section-header', '');
      h.textContent = label;
      scope.appendChild(h);
    }
    document.body.appendChild(scope);
    return scope;
  };

  it('adds one Decode per section header', () => {
    const scope = makeScope(['Genre', 'Rating', 'Released']);
    const tl = gsap.timeline({ paused: true });
    decodeGroup(tl, headersIn(scope));

    expect(tl.getChildren(false, true, false).length).toBe(3);
  });

  it('starts every header at the same moment — one group beat', () => {
    const scope = makeScope(['Genre', 'Rating', 'Released']);
    const tl = gsap.timeline({ paused: true });
    decodeGroup(tl, headersIn(scope));

    const starts = tl.getChildren(false, true, false).map((t) => t.startTime());
    expect(new Set(starts).size).toBe(1);
  });

  it('decodes each header toward its own text', () => {
    const scope = makeScope(['Genre', 'Rating']);
    const tl = gsap.timeline({ paused: true });
    decodeGroup(tl, headersIn(scope));

    tl.progress(1);
    const texts = Array.from(scope.querySelectorAll('[data-section-header]')).map(
      (el) => el.textContent,
    );
    expect(texts).toEqual(['Genre', 'Rating']);
  });

  it('leaves a scope with no headers as an empty build', () => {
    const scope = makeScope([]);
    const tl = gsap.timeline({ paused: true });
    expect(() => decodeGroup(tl, headersIn(scope))).not.toThrow();
    expect(tl.getChildren(false, true, false).length).toBe(0);
  });
});
