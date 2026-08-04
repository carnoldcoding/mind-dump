import { useEffect, useRef, useState } from 'react';
import { animationsDisabled } from '../utils/animations';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TICK_MS = 45;
const PER_CHAR_MS = 55;
const JITTER_MS = 90;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * Nier-style text decode: every character position scrambles through random
 * letters simultaneously, each locking into place at a staggered time so the
 * word coheres left-to-right. Waits for `ready` before its first run —
 * callers decide what "ready" means (the boot sequence's header stage for
 * PageHeader, a local per-panel reveal stage elsewhere). Every text change
 * after that replays it immediately.
 *
 * `onDone` fires when the last character locks. Decode is driven by
 * setInterval rather than CSS, so it cannot emit `animationend` like the other
 * primitives — this callback is how it reports into a panel's reveal
 * sequence. It is held in a ref so a parent passing a fresh inline arrow on
 * every render doesn't restart a title that has already settled.
 *
 * PER_CHAR_MS is the lever for overall pacing: decode is the longest stage in
 * a panel reveal, so a long title sets the length of the whole sequence.
 */
export const useDecodeText = (text: string, ready: boolean, onDone?: () => void) => {
  const [display, setDisplay] = useState('');
  const intervalRef = useRef<number | undefined>(undefined);
  const onDoneRef = useRef(onDone);

  onDoneRef.current = onDone;

  useEffect(() => {
    if (!ready) return;

    if (animationsDisabled()) {
      setDisplay(text);
      onDoneRef.current?.();
      return;
    }

    const lockTimes = text.split('').map((char, i) => (char === ' ' ? 0 : i * PER_CHAR_MS + Math.random() * JITTER_MS));
    const maxLock = Math.max(0, ...lockTimes);
    const start = performance.now();

    window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const next = text
        .split('')
        .map((char, i) => (char === ' ' || elapsed >= lockTimes[i] ? char : randomGlyph()))
        .join('');
      setDisplay(next);

      if (elapsed >= maxLock) {
        window.clearInterval(intervalRef.current);
        setDisplay(text);
        onDoneRef.current?.();
      }
    }, TICK_MS);

    return () => window.clearInterval(intervalRef.current);
  }, [text, ready]);

  return display;
};
