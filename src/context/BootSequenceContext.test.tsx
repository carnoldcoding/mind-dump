import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
import gsap from 'gsap';
import { BootSequenceProvider, useBootSequence } from './BootSequenceContext';
import { useRevealSignal } from '../hooks/useRevealSignal';
import { resetMotionOverride, setMotionOverride } from '../utils/animations';

const Probe = () => {
  const { stage } = useBootSequence();
  const revealed = useRevealSignal();

  return (
    <>
      <p data-testid="stage">{stage}</p>
      <p data-testid="revealed">{revealed ? 'yes' : 'no'}</p>
    </>
  );
};

const renderBoot = () =>
  render(
    <BootSequenceProvider>
      <Probe />
    </BootSequenceProvider>,
  );

const stage = () => screen.getByTestId('stage').textContent;
const revealed = () => screen.getByTestId('revealed').textContent;

/**
 * Boot's clock is a GSAP timeline, so a test moves it rather than waiting on
 * it. `gsap.globalTimeline.progress` would drag every other tween along with
 * it, so this advances the ticker instead — the one place in the suite that
 * needs a clock at all, because the thing under test *is* the clock.
 */
const advance = (seconds: number) => {
  act(() => {
    gsap.globalTimeline.time(gsap.globalTimeline.time() + seconds);
  });
};

afterEach(() => {
  cleanup();
  resetMotionOverride();
  vi.unstubAllEnvs();
});

/**
 * Boot's gestures live on the same timeline as its stages now. These render
 * stand-ins carrying the same `data-boot-*` markers the real components do,
 * because what is under test is the timeline addressing them — not the
 * corner geometry or the 480-polygon mesh.
 */
const BootSubjects = () => (
  <>
    <span data-boot-line />
    <span data-boot-triangle />
    <nav data-boot-border><span /><span /></nav>
    <footer data-boot-border-reverse />
  </>
);

const renderBootWithSubjects = () =>
  render(
    <BootSequenceProvider>
      <Probe />
      <BootSubjects />
    </BootSequenceProvider>,
  );

describe("boot's own gestures", () => {
  it('hides the corner lines before the sequence starts', () => {
    renderBootWithSubjects();
    // GSAP writes the composed matrix, so a scaleX of 0 reads as scale(0, 1).
    expect((document.querySelector('[data-boot-line]') as HTMLElement).style.transform).toBe('scale(0, 1)');
  });

  it('starts the triangle mesh black, so the screen begins solid', () => {
    renderBootWithSubjects();
    expect((document.querySelector('[data-boot-triangle]') as HTMLElement).style.fill).toBe('rgb(0, 0, 0)');
  });

  it('draws the two borders from opposite ends', () => {
    renderBootWithSubjects();

    const top = document.querySelector('[data-boot-border]') as HTMLElement;
    const bottom = document.querySelector('[data-boot-border-reverse]') as HTMLElement;

    expect(top.style.clipPath).toBe('inset(0 100% 0 0)');
    expect(bottom.style.clipPath).toBe('inset(0 0 0 100%)');
  });

  it('addresses the nav items as the bar\'s children, since NavTab forwards no data props', () => {
    renderBootWithSubjects();
    const items = document.querySelectorAll('[data-boot-border] > *');
    expect(items).toHaveLength(2);
    expect((items[0] as HTMLElement).style.opacity).toBe('0');
  });

  it('leaves nothing inline once the whole sequence has run', () => {
    renderBootWithSubjects();
    advance(6);

    const line = document.querySelector('[data-boot-line]') as HTMLElement;
    expect(line.style.opacity).toBe('');
  });

  it('resolves everything to its resting state when motion is disabled', () => {
    setMotionOverride('off');
    renderBootWithSubjects();

    const top = document.querySelector('[data-boot-border]') as HTMLElement;
    expect(top.style.clipPath).toBe('');
    expect(stage()).toBe('done');
  });
});

describe('the boot sequence', () => {
  it('starts on its first stage', () => {
    renderBoot();
    expect(stage()).toBe('lines');
  });

  it('withholds the reveal signal until it reaches the header stage', () => {
    renderBoot();
    expect(revealed()).toBe('no');
  });

  it('advances through its stages in order as the clock runs', () => {
    renderBoot();

    advance(0.5);
    expect(stage()).toBe('triangles');

    advance(0.7);
    expect(stage()).toBe('borders');

    advance(0.5);
    expect(stage()).toBe('nav');
  });

  it('raises the reveal signal at the header stage, before boot is done', () => {
    renderBoot();

    advance(0.5 + 0.7 + 0.5 + 0.6);

    expect(stage()).toBe('header');
    expect(revealed()).toBe('yes');
  });

  /**
   * A latch, not an event. A surface whose data lands late must still find the
   * signal raised rather than having missed it.
   */
  it('keeps the reveal signal raised once boot is finished', () => {
    renderBoot();

    advance(5);

    expect(stage()).toBe('done');
    expect(revealed()).toBe('yes');
  });

  describe('skipping', () => {
    it('seeks to the end rather than jumping the state, so every stage still fires', () => {
      renderBoot();

      act(() => {
        fireEvent.click(window);
      });

      expect(stage()).toBe('done');
      expect(revealed()).toBe('yes');
    });
  });

  /**
   * Boot was deliberately ungated before, on the grounds that it sat outside
   * the motion vocabulary's remit. It is a timeline like any other now, and a
   * ~3.1s animated boot is what a reduced-motion preference is asking to skip.
   */
  describe('when motion is disabled', () => {
    it('is already finished on the first frame', () => {
      setMotionOverride('off');
      renderBoot();

      expect(stage()).toBe('done');
    });

    it('raises the reveal signal immediately, so surfaces do not wait', () => {
      setMotionOverride('off');
      renderBoot();

      expect(revealed()).toBe('yes');
    });
  });
});
