import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { Modal } from './Modal';
import { resetMotionOverride, setMotionOverride } from '../../utils/animations';

const renderModal = (props: Partial<React.ComponentProps<typeof Modal>> = {}) =>
  render(
    <Modal open onClose={vi.fn()} label="Test dialog" {...props}>
      <p>contents</p>
    </Modal>,
  );

/** Move the shared clock, rather than waiting on it. */
const advance = (seconds: number) => {
  act(() => {
    gsap.globalTimeline.time(gsap.globalTimeline.time() + seconds);
  });
};

/** Long enough for any entrance or exit here to have finished. */
const settle = () => advance(2);

afterEach(() => {
  cleanup();
  resetMotionOverride();
  vi.unstubAllEnvs();
});

describe('Modal', () => {
  it('renders nothing while closed', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders its contents when open', () => {
    renderModal();
    expect(screen.getByText('contents')).toBeTruthy();
  });

  /**
   * A modal is a solid surface, so it wipes; its backdrop is a dimming field
   * with no geometry to wipe, so it fades. Two of the seven copies this
   * replaces carried a bare translucent background with no entrance at all,
   * so the backdrop landed in one frame while the thing it dims was still
   * arriving.
   */
  it('wipes the surface and fades the backdrop from the same frame', () => {
    const { container } = renderModal();

    const backdrop = document.querySelector('[data-modal-backdrop]') as HTMLElement;
    const surface = document.querySelector('[data-modal-surface]') as HTMLElement;

    expect(surface.style.clipPath).toContain('inset');
    expect(backdrop.style.opacity).not.toBe('');
    expect(container).toBeTruthy();
  });

  /**
   * The reason nothing in this app has ever animated out: every call site
   * wrote `{open && <Modal/>}`, and a component the parent has removed has
   * nothing left to animate. The modal owns its own presence now.
   */
  describe('closing', () => {
    const close = (rerender: (ui: React.ReactElement) => void) =>
      rerender(
        <Modal open={false} onClose={vi.fn()} label="Test dialog">
          <p>contents</p>
        </Modal>,
      );

    it('stays in the DOM while its exit plays', () => {
      const { rerender } = renderModal();
      advance(0.2); // let the entrance get somewhere to come back from

      close(rerender);

      expect(screen.queryByRole('dialog')).not.toBeNull();
    });

    it('leaves once the exit has finished', () => {
      const { rerender } = renderModal();
      advance(0.2);

      close(rerender);
      settle();

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    /**
     * A modal closed before its entrance had a frame to run in is already at
     * the start, and GSAP fires no onReverseComplete for a reversal with
     * nowhere to go. Waiting on that callback would strand a closed dialog on
     * screen forever.
     */
    it('leaves at once if it is closed before its entrance has moved', () => {
      const { rerender } = renderModal();

      close(rerender);

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('dismissing', () => {
    it('asks to close when the backdrop is pressed', () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.mouseDown(document.querySelector('[data-modal-backdrop]')!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores a press that started inside the dialog', () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.mouseDown(screen.getByText('contents'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('asks to close on Escape, rather than vanishing by itself', () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.keyDown(window, { key: 'Escape' });

      // It asks the caller, so the exit plays on the same path the close
      // button takes instead of a second one that skips it.
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeNull();
    });
  });

  describe('when motion is disabled', () => {
    it('opens at its resting state', () => {
      setMotionOverride('off');
      renderModal();

      const surface = document.querySelector('[data-modal-surface]') as HTMLElement;
      expect(surface.style.clipPath).toBe('inset(0 0% 0 0)');
    });

    it('leaves immediately rather than holding a closed dialog on screen', () => {
      setMotionOverride('off');
      const { rerender } = renderModal();

      rerender(
        <Modal open={false} onClose={vi.fn()} label="Test dialog">
          <p>contents</p>
        </Modal>,
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
