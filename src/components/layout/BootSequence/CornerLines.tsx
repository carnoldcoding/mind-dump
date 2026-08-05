import { useEffect, useState } from 'react';
import { useBootSequence, stageIndex } from '../../../context/BootSequenceContext';

interface Geometry {
  diagonalAngleDeg: number;
  diagonalLength: number;
  topLineY: number;
  isMobile: boolean;
}

// The border line (.nier-dot-pattern::before) sits 1.25rem above the bottom
// edge of whichever element carries the class — see custom.css. Measuring the
// real element, rather than guessing a viewport percentage, keeps this lined
// up even as nav's own height changes (padding/margin tweaks, breakpoint,
// font size, etc).
const BORDER_LINE_OFFSET_PX = 20; // 1.25rem at the default 16px root size

const measure = (): Geometry => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // `[data-top-rule]`, not `.nier-dot-pattern`. The footer wears that class
  // too — it is a mirror of the nav bar, which is the whole point of it — so
  // the class alone identifies two elements and the query returned whichever
  // came first in the DOM. That was the nav only because the footer used to
  // not exist yet: it was mounted by its own boot stage. Now that every boot
  // element renders from the first frame, the footer is there at measuring
  // time and sits *above* the nav in Layout, so this line was being placed
  // 20px off the bottom of the screen instead of the top.
  const patternEl = document.querySelector('[data-top-rule]');
  const topLineY = patternEl
    ? patternEl.getBoundingClientRect().bottom - BORDER_LINE_OFFSET_PX
    : h * 0.11;
  return {
    diagonalAngleDeg: Math.atan2(h, w) * (180 / Math.PI),
    diagonalLength: Math.sqrt(w * w + h * h),
    topLineY,
    isMobile: w < 768, // matches Layout.tsx's own breakpoint threshold
  };
};

/**
 * Matches the reference boot-load frame (screenshots/line-design-menu-load.png):
 * a symmetric X of two full corner-to-corner diagonals, plus a horizontal bar
 * near the top and one near the bottom. All four lines share the exact same
 * grow animation (see bootLines) — only rotation/anchor/length differ,
 * so the two diagonals (and the two horizontals) are true mirror images of
 * each other, not four independently-tuned lines.
 *
 * The lines hold at full opacity through the 'triangles' stage too (the
 * triangle mesh pops in over them, all one continuous construction), then
 * fade out once triangles are done. On skip/settle they vanish instantly —
 * no lingering fade — matching every other boot stage's settled behavior.
 */
const CornerLines = () => {
  const { stage } = useBootSequence();
  const [geometry, setGeometry] = useState<Geometry>(measure);

  useEffect(() => {
    // Re-measure once the DOM is actually committed — the initial useState
    // call above runs during render, before nav is guaranteed queryable.
    setGeometry(measure());
    const handleResize = () => setGeometry(measure());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (stage === 'done') return null;

  const pastTriangles = stageIndex(stage) > stageIndex('triangles');
  const { diagonalAngleDeg, diagonalLength, topLineY, isMobile } = geometry;

  return (
    <div
      className={`fixed inset-0 pointer-events-none -z-20 transition-opacity duration-300 ${pastTriangles ? 'opacity-0' : 'opacity-100'}`}
      aria-hidden="true"
    >
      {/* Diagonal: top-left corner -> bottom-right corner */}
      <div
        data-boot-line
        className="absolute h-[1.5px] bg-nier-150/60"
        style={{
          top: 0,
          left: 0,
          width: `${diagonalLength}px`,
          transformOrigin: 'left center',
          rotate: `${diagonalAngleDeg}deg`,
        } as React.CSSProperties}
      />
      {/* Diagonal: top-right corner -> bottom-left corner (mirror of the above) */}
      <div
        data-boot-line
        className="absolute h-[1.5px] bg-nier-150/60"
        style={{
          top: 0,
          right: 0,
          width: `${diagonalLength}px`,
          transformOrigin: 'right center',
          rotate: `${-diagonalAngleDeg}deg`,
        } as React.CSSProperties}
      />
      {/* Horizontal bars (top + bottom) are desktop-only — mobile's nav is a
          slide-out drawer, not a full-width bar, so there's nothing for
          these to line up with. */}
      {!isMobile && (
        <>
          {/* Growing outward from center — aligned to line up exactly with
              the nav's own border line once it appears */}
          <div
            data-boot-line
            className="absolute h-[1.5px] w-full bg-nier-150/60"
            style={{
              top: `${topLineY}px`,
              left: 0,
              transformOrigin: 'center',
              rotate: '0deg',
            } as React.CSSProperties}
          />
          {/* Mirror of the above, near the bottom */}
          <div
            data-boot-line
            className="absolute h-[1.5px] w-full bg-nier-150/60"
            style={{
              top: '98%',
              left: 0,
              transformOrigin: 'center',
              rotate: '0deg',
            } as React.CSSProperties}
          />
        </>
      )}
    </div>
  );
};

export default CornerLines;
