import { useMemo } from 'react';
import { useStageState } from '../../../context/BootSequenceContext';

const COLS = 20;
const ROWS = 12;
const CELL_W = 100 / COLS;
const CELL_H = 100 / ROWS;

interface Triangle {
  key: string;
  points: string;
  delay: number;
}

const buildTriangles = (): Triangle[] => {
  const triangles: Triangle[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * CELL_W;
      const y = row * CELL_H;
      const delay = (row + col) * 18;
      triangles.push({
        key: `${row}-${col}-tl`,
        points: `${x},${y} ${x + CELL_W},${y} ${x},${y + CELL_H}`,
        delay,
      });
      triangles.push({
        key: `${row}-${col}-br`,
        points: `${x + CELL_W},${y} ${x + CELL_W},${y + CELL_H} ${x},${y + CELL_H}`,
        delay: delay + 6,
      });
    }
  }
  return triangles;
};

/**
 * The boot sequence's triangle-fill stage — pops in once, then stays
 * permanently as the page's resting background (it replaces the flat
 * body background, it isn't a transient intro effect).
 *
 * z-index is a negative value on purpose: this is a fixed, full-viewport
 * layer that must sit behind every page section. Page content here uses
 * `position: relative` with no explicit z-index (i.e. z-index: auto),
 * which CSS ranks below any *explicit* z-index, positive or not — so a
 * positive value here (as this used to be) paints above real content.
 *
 * Once boot is done, every triangle has converged to the same resting
 * fill anyway (see nier-boot-triangle-pop), so the ~480-polygon mesh is
 * collapsed to a single rect — this also sidesteps the hairline seam
 * artifacts adjacent same-color SVG polygons leave from anti-aliasing.
 */
const TriangleGrid = () => {
  const { active, settled } = useStageState('triangles');
  const triangles = useMemo(buildTriangles, []);

  if (!active || settled) {
    return <div className={`fixed inset-0 -z-30 ${active ? 'bg-nier-50' : 'bg-black'}`} aria-hidden="true" />;
  }

  return (
    <svg
      className="fixed inset-0 -z-30 w-screen h-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {triangles.map((triangle) => (
        <polygon
          key={triangle.key}
          points={triangle.points}
          className="nier-boot-triangle"
          style={{ animationDelay: `${triangle.delay}ms`, fill: '#000000' }}
        />
      ))}
    </svg>
  );
};

export default TriangleGrid;
