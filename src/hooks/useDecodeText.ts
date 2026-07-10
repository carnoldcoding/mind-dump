import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TICK_MS = 45;
const PER_CHAR_MS = 55;
const JITTER_MS = 90;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * Nier-style text decode: every character position scrambles through
 * random letters simultaneously, each locking into place at a staggered
 * time so the word coheres left-to-right. Waits for `ready` before its
 * first run — callers decide what "ready" means (the boot sequence's
 * header stage for PageHeader, a local per-panel reveal stage elsewhere).
 * Every text change after that replays it immediately.
 */
export const useDecodeText = (text: string, ready: boolean) => {
  const [display, setDisplay] = useState('');
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;

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
      }
    }, TICK_MS);

    return () => window.clearInterval(intervalRef.current);
  }, [text, ready]);

  return display;
};
