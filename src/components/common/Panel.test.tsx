import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import gsap from 'gsap';
import { Panel } from './Panel';
import { wipe } from '../../utils/motion';
import { resetMotionOverride } from '../../utils/animations';

describe('Panel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    resetMotionOverride();
  });

  const renderPanel = (props: Partial<React.ComponentProps<typeof Panel>> = {}) =>
    render(
      <Panel {...props}>
        <p>contents</p>
      </Panel>,
    );

  it('renders its children', () => {
    renderPanel();
    expect(screen.getByText('contents')).toBeTruthy();
  });

  /**
   * The desync this component exists to prevent. The frame and the shadow it
   * casts were siblings gated by hand at every call site, and two of the four
   * gated them differently — the shadow animated in while the frame was still
   * invisible, so the shadow arrived before the thing casting it.
   *
   * One selector reaching both is a stronger guarantee than the shared gate
   * was: a caller cannot desync them because there is no second animation for
   * the first one to disagree with.
   */
  it('offers the frame and its shadow to a timeline as one target', () => {
    const { container } = renderPanel();

    const surfaces = container.querySelectorAll('[data-panel-surface]');
    const frame = screen.getByTestId('panel-frame');

    expect(surfaces).toHaveLength(2);
    expect(Array.from(surfaces)).toContain(frame);
  });

  it('animates both surfaces from a single tween', () => {
    const { container } = renderPanel();
    const timeline = gsap.timeline({ paused: true });

    wipe(timeline, container.querySelectorAll('[data-panel-surface]'));

    const [shadow, frame] = [
      container.querySelector('[data-panel-shadow]') as HTMLElement,
      screen.getByTestId('panel-frame'),
    ];

    expect(shadow.style.clipPath).toBe(frame.style.clipPath);
    expect(frame.style.clipPath).toContain('inset');
  });

  /**
   * The Wipe sets clip-path, which makes the frame establish its own stacking
   * context. A `-z-1` child would be trapped inside it rather than painting
   * behind the whole frame, so the shadow has to stay a sibling.
   */
  it('keeps the shadow outside the frame, never inside it', () => {
    const { container } = renderPanel();

    const shadow = container.querySelector('[data-panel-shadow]');
    const frame = screen.getByTestId('panel-frame');

    expect(frame.contains(shadow)).toBe(false);
    expect(shadow?.parentElement).toBe(frame.parentElement);
  });

  /**
   * Panel owns shape, not appearance: Desktop is bg-nier-50 where the rest are
   * bg-nier-100, and a default baked in here would put two competing bg-*
   * classes on one element, with stylesheet order picking the winner instead
   * of the caller.
   */
  it('leaves background and borders to the caller', () => {
    renderPanel({ className: 'bg-nier-50 border border-nier-150' });

    const frame = screen.getByTestId('panel-frame');

    expect(frame.className).toContain('bg-nier-50');
    expect(frame.className).not.toContain('bg-nier-100');
  });

  it('exposes the wrapper as a scope, so a timeline can reach the shadow too', () => {
    const scope = { current: null } as React.RefObject<HTMLDivElement | null>;
    const { container } = renderPanel({ wrapperRef: scope });

    const shadow = container.querySelector('[data-panel-shadow]');

    expect(scope.current).not.toBeNull();
    expect(scope.current!.contains(shadow)).toBe(true);
  });
});
