import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
import gsap from 'gsap';
import {
  BootSequenceProvider,
  useBootSequence,
  useRevealSignal,
} from './BootSequenceContext';
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
