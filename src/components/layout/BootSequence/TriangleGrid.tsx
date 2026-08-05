import { useMemo } from 'react';
import { useStageState } from '../../../context/BootSequenceContext';

const COLS = 20;
const ROWS = 12;
const CELL_W = 100 / COLS;
const CELL_H = 100 / ROWS;

interface Triangle {
  key: string;
  points: string;
}

const buildTriangles = (): Triangle[] => {
  const triangles: Triangle[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * CELL_W;
      const y = row * CELL_H;
      triangles.push({
        key: `${row}-${col}-tl`,
        points: `${x},${y} ${x + CELL_W},${y} ${x},${y + CELL_H}`,
      });
      triangles.push({
        key: `${row}-${col}-br`,
        points: `${x + CELL_W},${y} ${x + CELL_W},${y + CELL_H} ${x},${y + CELL_H}`,
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
 * fill anyway (see bootTriangles), so the ~480-polygon mesh is
 * collapsed to a single rect — this also sidesteps the hairline seam
 * artifacts adjacent same-color SVG polygons leave from anti-aliasing.
 */
const TriangleGrid = () => {
  const { settled } = useStageState('triangles');
  const triangles = useMemo(buildTriangles, []);

  // Once boot is done every triangle has converged on the same tone, so the
  // mesh collapses to one rect — cheaper, and it sidesteps the hairline seams
  // anti-aliasing leaves between adjacent same-colour polygons.
  if (settled) {
    return <div className="fixed inset-0 -z-30 bg-nier-50" aria-hidden="true" />;
  }

  return (
    <svg
      // Explicit size, unlike the settled <div> branch below: an <svg> is a
      // replaced element, so inset-0 alone leaves it at the 300x150 default
      // instead of stretching. lvh for the same reason as the other fixed
      // decorative layers — never uncover a strip while iOS resizes.
      className="fixed inset-0 w-screen h-lvh -z-30"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {triangles.map((triangle) => (
        <polygon
          key={triangle.key}
          points={triangle.points}
          data-boot-triangle
          style={{ transformBox: 'fill-box', transformOrigin: 'center', fill: '#000000' }}
        />
      ))}
    </svg>
  );
};

export default TriangleGrid;
