import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Panel } from './Panel';
import { resetMotionOverride } from '../../utils/animations';

describe('Panel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    resetMotionOverride();
  });

  const renderPanel = (props: Partial<React.ComponentProps<typeof Panel>> = {}) =>
    render(
      <Panel ready stage="box" onBoxRevealed={vi.fn()} {...props}>
        <p>contents</p>
      </Panel>,
    );

  it('draws the frame and its offset shadow as one unit', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const { container } = renderPanel();

    const shadow = container.querySelector('[data-panel-shadow]');
    const frame = screen.getByTestId('panel-frame');

    expect(shadow).not.toBeNull();
    expect(shadow?.className).toContain('nier-wipe');
    expect(frame.className).toContain('nier-wipe');
  });

  it('never lets the shadow animate without the frame — they share one gate', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const { container } = renderPanel({ ready: false });

    const shadow = container.querySelector('[data-panel-shadow]');
    const frame = screen.getByTestId('panel-frame');

    // The desync this component exists to prevent: one visible, one not.
    expect(shadow?.className.includes('invisible')).toBe(frame.className.includes('invisible'));
  });

  it('drops the wipe class entirely when motion is disabled', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', 'true');
    const { container } = renderPanel();

    expect(container.querySelector('[data-panel-shadow]')?.className).not.toContain('nier-wipe');
    expect(screen.getByTestId('panel-frame').className).not.toContain('nier-wipe');
  });

  it('reports the box stage when the frame itself finishes wiping', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const onBoxRevealed = vi.fn();
    renderPanel({ onBoxRevealed });

    // bubbles: true because real browsers bubble animationend and
    // testing-library's default init does not — React's root delegation
    // never sees a non-bubbling event.
    fireEvent.animationEnd(screen.getByTestId('panel-frame'), { bubbles: true });

    expect(onBoxRevealed).toHaveBeenCalledTimes(1);
  });

  it('ignores an animationend bubbling up from its contents', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    const onBoxRevealed = vi.fn();
    render(
      <Panel ready stage="cards" onBoxRevealed={onBoxRevealed}>
        <span data-testid="card">card</span>
      </Panel>,
    );

    // A card finishing its domino must not be mistaken for the frame's wipe.
    fireEvent.animationEnd(screen.getByTestId('card'), { bubbles: true });

    expect(onBoxRevealed).not.toHaveBeenCalled();
  });

  it('renders its children', () => {
    vi.stubEnv('VITE_DISABLE_ANIMATIONS', undefined);
    renderPanel();
    expect(screen.getByText('contents')).toBeTruthy();
  });
});
