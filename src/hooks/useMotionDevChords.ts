import { useEffect, useSyncExternalStore } from 'react';
import { getMotionVersion, replayReveal, subscribeMotion, toggleMotion } from '../utils/animations';

/**
 * Dev-only motion controls, so iterating on a ~1.1s reveal doesn't mean
 * editing .env.local and restarting Vite for every tweak.
 *
 *   Ctrl+Alt+M — turn motion on/off in place
 *   Ctrl+Alt+R — replay the current page's reveal
 *
 * Alt rather than Shift because Ctrl+Shift+R is the browser's hard-reload and
 * Ctrl+Shift+M is DevTools' device toolbar; both are reserved shortcuts that a
 * page cannot cancel, so preventDefault would not have held them.
 *
 * Guarded by import.meta.env.DEV, which is statically false in a production
 * build — the listener and its imports drop out entirely.
 */
export const useMotionDevChords = () => {
  /**
   * Subscribed from the shell so a toggle re-renders the whole tree.
   * `enterClass` is a plain read, and most of its callers are modals that
   * early-return before they could legally call a hook — so rather than each
   * of them subscribing, the one component above all of them does, and their
   * next render picks the new value up. Blunt, but this is a dev-only control
   * and the alternative is a hook call every modal is shaped wrong for.
   */
  useSyncExternalStore(subscribeMotion, getMotionVersion, getMotionVersion);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey) return;

      const key = event.key.toLowerCase();
      if (key !== 'm' && key !== 'r') return;

      event.preventDefault();
      if (key === 'm') toggleMotion();
      else replayReveal();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
