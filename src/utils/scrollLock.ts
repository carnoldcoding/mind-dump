import { useEffect } from 'react';

/**
 * Freeze the app's one scroll container while an overlay is open.
 *
 * The fixed-viewport shell puts all scrolling in #app-scroll
 * (docs/adr/0008-fixed-viewport-shell.md). An open overlay makes the content
 * behind it inert, so its scroll is frozen — the visible half of "the page
 * behind an overlay does not move." This is the lock half of the one overlay
 * contract; the dimming backdrop is the other half, owned by each overlay.
 *
 * Ref-counted, so two overlays open at once (a modal raised from inside the
 * filter menu, say) do not let the first to close unfreeze the page while the
 * second is still up. The class comes off only when the last one leaves.
 *
 * A no-op when #app-scroll is absent — a component test rendering an overlay
 * without the shell locks nothing rather than throwing.
 */
let lockCount = 0;

const apply = () => {
  document
    .getElementById('app-scroll')
    ?.classList.toggle('scroll-locked', lockCount > 0);
};

export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    apply();
    return () => {
      lockCount -= 1;
      apply();
    };
  }, [active]);
};
