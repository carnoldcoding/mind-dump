import { useMemo } from 'react';
import { useStageState } from '../../../context/BootSequenceContext';
import { useReviews } from '../../../store/reviews';
import { readoutsFor } from '../../../utils/readouts';

/**
 * The page footer: a band along the bottom of the viewport, bordered along its
 * top edge by the same nier-dot-pattern line and strip the nav bar wears — a
 * mirror of it. Wipes in alongside the nav's own border during the 'borders'
 * stage so the two read as one synchronized frame being drawn — but
 * right-to-left (nier-boot-border-wipe-reverse), opposite the top bar's
 * left-to-right direction.
 *
 * It used to hold nothing at all, and was hidden from assistive technology on
 * that basis. It now carries the site's readouts, so it is content — a real
 * landmark, saying where the collection stands, on every page.
 *
 * The -scale-y-100 flip is scoped to the border strip alone. It used to sit on
 * the whole bar — harmless while the bar was empty, and upside-down the moment
 * anything was put in it.
 */
const BottomBar = () => {
  const { active, animating } = useStageState('borders');
  const { reviews } = useReviews();

  const readouts = useMemo(() => readoutsFor(reviews), [reviews]);

  if (!active) return null;

  return (
    // bottom-0, not an offset: the border strip's own reserved padding holds
    // the line and the pattern, so lifting it off the viewport edge only
    // opened a gap of bare page background underneath it.
    <footer
      className={`fixed bottom-0 left-0 w-screen z-50 ${animating ? 'nier-boot-border-wipe-reverse' : ''}`}
      aria-label="Collection status"
    >
      {/* The class puts the line and pattern along its own bottom edge; the
          flip brings them to the top, so they read as the footer's top border
          rather than as the whole footer. */}
      <div className="-scale-y-100" aria-hidden="true">
        <div className="nier-dot-pattern bg-nier-50 w-full" />
      </div>

      <div className="bg-nier-50 w-full">
        <div className="max-w-7xl mx-auto px-4 h-[var(--nier-footer-row)] flex items-center gap-x-5 overflow-hidden">
          {/* Entries drop rather than wrap as the viewport narrows, so the
              band keeps its single-line height on a phone. */}
          <Readout label="In Progress" value={readouts.inProgress} />
          <Readout label="Queued" value={readouts.queued} />
          <Readout
            label={`Finished ${new Date().getFullYear()}`}
            value={readouts.finishedThisYear}
            className="hidden sm:flex"
          />
          {readouts.averageRating !== null && (
            <Readout
              label="Avg Rating"
              value={readouts.averageRating.toFixed(1)}
              className="hidden md:flex"
            />
          )}
        </div>
      </div>
    </footer>
  );
};

const Readout = ({ label, value, className = '' }: {
  label: string;
  value: number | string;
  className?: string;
}) => (
  <p className={`flex items-baseline gap-1.5 whitespace-nowrap ${className}`}>
    <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">{label}</span>
    <span className="text-xs tracking-wider text-nier-text-dark">{value}</span>
  </p>
);

export default BottomBar;
