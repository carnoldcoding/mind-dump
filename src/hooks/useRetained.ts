import { useRef } from 'react';

/**
 * The last value that was actually there.
 *
 * A modal showing a selection — the Movement being edited, the Entry being
 * corrected — is opened by that selection becoming non-null and closed by it
 * going back to null. Now that closing plays an exit rather than vanishing,
 * the modal outlives the selection by the length of that animation, and would
 * spend it rendering an empty dialog with the record it was about to describe
 * already gone.
 *
 * Holding the last non-null value means the exit plays over what the reader
 * was looking at. It is deliberately never cleared: the next open overwrites
 * it, and nothing is rendered from it in between.
 */
export const useRetained = <T,>(value: T | null | undefined): T | null => {
  const retained = useRef<T | null>(null);
  if (value != null) retained.current = value;
  return retained.current;
};
