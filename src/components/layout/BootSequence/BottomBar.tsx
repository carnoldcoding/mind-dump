import { useMemo } from 'react';
import { useStageState } from '../../../context/BootSequenceContext';
import { useReviews, isUnfinished } from '../../../store/reviews';

/**
 * The page footer: a band along the bottom of the viewport, bordered along its
 * top edge by the same nier-dot-pattern line and strip the nav bar wears — a
 * mirror of it. Wipes in alongside the nav's own border during the 'borders'
 * stage so the two read as one synchronized frame being drawn — but
 * right-to-left (nier-boot-border-wipe-reverse), opposite the top bar's
 * left-to-right direction.
 *
 * It used to hold nothing at all, and was hidden from assistive technology on
 * that basis. It now carries the site's readouts, so it is content: permanent
 * chrome saying where the collection stands, on every page.
 *
 * The -scale-y-100 flip is scoped to the border strip alone. It used to sit on
 * the whole bar — harmless while the bar was empty, and upside-down the moment
 * anything was put in it.
 */

const currentYear = () => new Date().getFullYear();

const BottomBar = () => {
  const { active, animating } = useStageState('borders');
  const { reviews } = useReviews();

  // Every figure is derived from Reviews already in the store: nothing is
  // entered, nothing is stored, and so nothing can be out of date.
  const stats = useMemo(() => {
    const finished = reviews.filter(r => r.status === 'done');
    const rated = finished.filter(r => typeof r.rating === 'number' && r.rating > 0);
    const year = `${currentYear()}`;

    return {
      inProgress: reviews.filter(r => r.status === 'active').length,
      queued: reviews.filter(r => r.status === 'todo').length,
      unfinished: reviews.filter(isUnfinished).length,
      finishedThisYear: finished.filter(r => r.date_completed?.startsWith(year)).length,
      averageRating: rated.length
        ? (rated.reduce((total, r) => total + (r.rating ?? 0), 0) / rated.length).toFixed(1)
        : null,
    };
  }, [reviews]);

  if (!active) return null;

  return (
    // bottom-0, not an offset: the border strip's own reserved padding holds
    // the line and the pattern, so lifting it off the viewport edge only
    // opened a gap of bare page background underneath it.
    <div
      className={`fixed bottom-0 left-0 w-screen z-50 ${animating ? 'nier-boot-border-wipe-reverse' : ''}`}
    >
      {/* The class puts the line and pattern along its own bottom edge; the
          flip brings them to the top, so they read as the footer's top border
          rather than as the whole footer. */}
      <div className="-scale-y-100" aria-hidden="true">
        <div className="nier-dot-pattern bg-nier-50 w-full" />
      </div>

      <div className="bg-nier-50 w-full">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center gap-x-5 overflow-hidden">
          {/* Entries drop rather than wrap as the viewport narrows, so the
              band keeps its single-line height on a phone. */}
          <Readout label="In Prog" value={stats.inProgress} />
          <Readout label="Queued" value={stats.queued} />
          <Readout label="Backlog" value={stats.unfinished} className="hidden sm:flex" />
          <Readout label={`Done ${currentYear()}`} value={stats.finishedThisYear} className="hidden sm:flex" />
          {stats.averageRating && (
            <Readout label="Avg" value={stats.averageRating} className="hidden md:flex" />
          )}
        </div>
      </div>
    </div>
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
