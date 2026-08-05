import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef, type RefObject } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
// `gsap.core.Timeline` needs no import — gsap's types declare a global `gsap`
// namespace, and importing the default export for a type position leaves an
// unused value binding.
import { useRevealTimeline } from './useRevealTimeline';
import { resetMotionOverride, setMotionOverride } from '../utils/animations';

/**
 * The *ref*, not the timeline it holds. `useRevealTimeline` fills it in a
 * layout effect — after render — so a test that grabbed the value during
 * render would always see the null it had before the timeline was built.
 */
let built: RefObject<gsap.core.Timeline | null> | null = null;

const timeline = () => built!.current!;

/**
 * A surface that fades its own child in. A test asks the timeline where it is
 * rather than advancing a clock — `progress()` reads synchronously, which is
 * the point of owning the clock instead of borrowing the browser's.
 */
const Surface = ({ ready }: { ready: boolean }) => {
  const scope = useRef<HTMLDivElement>(null);

  const revealed = useRevealTimeline(
    ready,
    (tl) => {
      tl.from('[data-testid="subject"]', { opacity: 0, duration: 0.3 });
    },
    scope,
  );

  built = revealed;

  return (
    <div ref={scope}>
      <p data-testid="subject">CURRENT VIEW PANEL</p>
    </div>
  );
};

const opacityOfSubject = () => screen.getByTestId('subject').style.opacity;

describe('useRevealTimeline', () => {
  beforeEach(() => {
    built = null;
  });

  afterEach(() => {
    cleanup();
    resetMotionOverride();
    vi.unstubAllEnvs();
  });

  it('builds the timeline at mount, before anything is ready', () => {
    render(<Surface ready={false} />);
    expect(built!.current).not.toBeNull();
  });

  /**
   * The regression test for the bug this design replaced.
   *
   * The old reveal gated with `visibility: hidden`, which does not stop a CSS
   * animation — so a panel that mounted before the boot sequence reached it
   * ran its wipe unseen, reported `animationend` to a stage machine that then
   * reset, and could never run again. The failure was not wrong values; it was
   * right values, spent too early. No test that mounts a surface with `ready`
   * already true can catch it, and every test in the old suite did exactly that.
   */
  it('has not advanced at all while it is not ready', () => {
    render(<Surface ready={false} />);

    expect(timeline().progress()).toBe(0);
    expect(timeline().paused()).toBe(true);
  });

  it('stays unspent across re-renders that do not make it ready', () => {
    const { rerender } = render(<Surface ready={false} />);
    rerender(<Surface ready={false} />);

    expect(timeline().progress()).toBe(0);
    expect(timeline().paused()).toBe(true);
  });

  it('holds the subject at its start value until played', () => {
    render(<Surface ready={false} />);
    expect(opacityOfSubject()).toBe('0');
  });

  it('plays when ready turns true', () => {
    const { rerender } = render(<Surface ready={false} />);
    expect(timeline().paused()).toBe(true);

    rerender(<Surface ready />);

    expect(timeline().paused()).toBe(false);
  });

  /**
   * `ready` is a latch rather than an event, so a surface whose data arrived
   * after the boot sequence had already passed it plays at once instead of
   * waiting for a signal that has gone by.
   */
  it('plays immediately for a surface that mounts after the signal has passed', () => {
    render(<Surface ready />);
    expect(timeline().paused()).toBe(false);
  });

  describe('when motion is disabled', () => {
    it('resolves to the finished state instead of animating', () => {
      setMotionOverride('off');
      render(<Surface ready={false} />);

      expect(timeline().progress()).toBe(1);
      expect(timeline().paused()).toBe(true);
    });

    it('leaves the subject at its resting value, not its start value', () => {
      setMotionOverride('off');
      render(<Surface ready={false} />);

      expect(opacityOfSubject()).not.toBe('0');
    });

    it('does not start playing when ready turns true', () => {
      setMotionOverride('off');
      const { rerender } = render(<Surface ready={false} />);

      rerender(<Surface ready />);

      expect(timeline().paused()).toBe(true);
      expect(timeline().progress()).toBe(1);
    });
  });
});
