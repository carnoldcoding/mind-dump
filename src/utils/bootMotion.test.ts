import { describe, expect, it } from 'vitest';
import { TRIANGLE_COLS, triangleDelay } from './bootMotion';

/**
 * The wave the triangle mesh pans in on. It used to be an inline
 * `animation-delay` of `(row + col) * 18ms` written onto every one of 480
 * polygons; these lock the same arithmetic now that it is a stagger function.
 *
 * Worth having as its own test because `stagger.grid` looks like the right
 * tool and is not: it measures Euclidean distance, which gives a circular
 * front where this has a straight diagonal one, and the mesh holds two
 * polygons per cell so a grid of [rows, cols] would not even map to it.
 */
describe('the triangle wave', () => {
  const cell = (row: number, column: number, second = false) =>
    triangleDelay((row * TRIANGLE_COLS + column) * 2 + (second ? 1 : 0));

  it('starts the first tile immediately', () => {
    expect(cell(0, 0)).toBe(0);
  });

  it('steps one unit per column', () => {
    expect(cell(0, 1)).toBeCloseTo(0.018);
    expect(cell(0, 2)).toBeCloseTo(0.036);
  });

  it('steps the same amount per row, so the front runs diagonally', () => {
    expect(cell(1, 0)).toBeCloseTo(0.018);
    expect(cell(2, 0)).toBeCloseTo(0.036);
  });

  /** A straight front, not a circular one — this is what `stagger.grid` gets wrong. */
  it('lands everything the same Manhattan distance out at the same moment', () => {
    expect(cell(3, 1)).toBeCloseTo(cell(1, 3));
    expect(cell(4, 0)).toBeCloseTo(cell(0, 4));
  });

  it('lands a cell\'s second triangle just behind its first', () => {
    expect(cell(2, 2, true) - cell(2, 2)).toBeCloseTo(0.006);
  });

  it('reaches the far corner last', () => {
    const far = cell(11, TRIANGLE_COLS - 1);
    expect(far).toBeCloseTo((11 + 19) * 0.018);
    expect(far).toBeGreaterThan(cell(0, 0));
  });
});
