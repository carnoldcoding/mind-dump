import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import CornerLines from './CornerLines';
import { BootSequenceProvider } from '../../../context/BootSequenceContext';

/**
 * The nav bar and the footer wear the same `nier-dot-pattern` class — the
 * footer is deliberately a mirror of the bar — so the class alone names two
 * elements. `[data-top-rule]` names one.
 */
const TOP_RULE_BOTTOM = 100;
const FOOTER_RULE_BOTTOM = 900;
const BORDER_LINE_OFFSET_PX = 20;

const stubRects = () =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const bottom = this.hasAttribute('data-top-rule') ? TOP_RULE_BOTTOM : FOOTER_RULE_BOTTOM;
    return { top: bottom - 40, bottom, left: 0, right: 0, width: 0, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });

/**
 * The footer first, as `Layout` has it — that ordering is what made this a bug
 * rather than a near miss.
 */
const renderWithChrome = () =>
  render(
    <BootSequenceProvider>
      <div className="nier-dot-pattern" data-testid="footer-rule" />
      <nav className="nier-dot-pattern" data-top-rule data-testid="top-rule" />
      <CornerLines />
    </BootSequenceProvider>,
  );

/**
 * The two horizontal bars, told apart from the two diagonals by the diagonals
 * carrying an inline width — they are sized to the screen's hypotenuse, where
 * the horizontals just take `w-full` from a class.
 */
const horizontalRules = () =>
  (Array.from(document.querySelectorAll('[data-boot-line]')) as HTMLElement[])
    .filter((line) => line.style.width === '');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the boot sequence\'s corner lines', () => {
  /**
   * The regression this exists for. `document.querySelector('.nier-dot-pattern')`
   * returned whichever of the two came first in the DOM, and that was the nav
   * only because the footer did not exist yet — it was mounted by its own boot
   * stage. Once every boot element rendered from the first frame, the footer
   * was there at measuring time and sits above the nav in Layout, so the top
   * rule was placed 20px off the *bottom* of the screen and the two horizontal
   * lines ended up on top of each other.
   */
  it('places the top rule against the nav bar, not the footer that shares its class', () => {
    stubRects();
    renderWithChrome();

    const [top] = horizontalRules();

    expect(top.style.top).toBe(`${TOP_RULE_BOTTOM - BORDER_LINE_OFFSET_PX}px`);
  });

  it('keeps the two horizontal rules at opposite ends of the screen', () => {
    stubRects();
    renderWithChrome();

    const [top, bottom] = horizontalRules();

    expect(top.style.top).toBe('80px');
    expect(bottom.style.top).toBe('98%');
  });

  it('falls back to a fraction of the viewport when there is no rule to measure', () => {
    stubRects();
    render(
      <BootSequenceProvider>
        <CornerLines />
      </BootSequenceProvider>,
    );

    const [top] = horizontalRules();

    // 11% of jsdom's default 768px-tall window.
    expect(top.style.top).toBe(`${window.innerHeight * 0.11}px`);
  });
});
