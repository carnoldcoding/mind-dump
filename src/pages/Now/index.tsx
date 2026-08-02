// The front page: what is being played, watched and read at this moment. The
// only view that answers "where am I" rather than "what do I have" — see
// CONTEXT.md and ADR-0003.
//
// Laid out as a NieR menu screen rather than as stacked bands of cards, which
// is what the reference screenshots in ../../../screenshots actually do:
//
//   ┌ CURRENT VIEW PANEL ─────────────────────────────────────────────┐
//   │ ▌ IN PROGRESS            ┌──────────┐  SHELVES                  │
//   │ ▌ ▪ Nioh 3      PLAYING  │  cover   │  ───────────────────────  │
//   │ ▐ ▪ Frieren    WATCHING  └──────────┘        underway / all     │
//   │ ▌ UP NEXT                NIOH 3          game          2 / 14   │
//   │ ▌ ▪ Hollow Knight  GAME  category  game  cinema        1 / 9    │
//   │ ▌ RECENTLY FINISHED      status    done  book          0 / 6    │
//   │ ▌ ▪ Doom           9 ★   released  2017  □□□□□□□□□□□            │
//   │ ▌                                             NO ERROR          │
//   │ ▌ Nioh 3 — in progress                 ↕ SELECT     ◉ OPEN      │
//   └─────────────────────────────────────────────────────────────────┘
//
// The list still leads with what's in progress, because that is the reason the
// page exists; queued and finished follow it in the same column, visibly
// secondary by position rather than by being a different kind of object.
//
// Selection is whatever the pointer or the keyboard is on, defaulting to the
// first row. There is no selection state to drive with keys of our own: every
// row is an anchor, so Tab already walks the list and Enter already opens —
// `onFocus` and `onMouseEnter` simply tell the detail pane what to show.

import { useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { ReviewCover } from "../../components/review/ReviewCover";
import { useReviews, type Review } from "../../store/reviews";
import { byNewestCompleted } from "../../utils/completionDate";
import { reviewPath } from "../../utils/categories";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { useDecodeText } from "../../hooks/useDecodeText";
import { usePanelHeight } from "../../hooks/usePanelHeight";
import { enterClass } from "../../utils/animations";
import { Link } from "react-router";

// How many queued Reviews the up-next section shows before handing off to the
// Backlog, and how many finished ones the last section carries.
const UP_NEXT_CAP = 5;
const RECENTLY_FINISHED_CAP = 5;

// Grouped by what you're doing with it, not by what kind of thing it is —
// "playing" and "reading" are different activities (story 2). The addresses
// these map to live in utils/categories.
const ACTIVITIES = [
    { type: "game", label: "PLAYING" },
    { type: "cinema", label: "WATCHING" },
    { type: "book", label: "READING" },
] as const;

const activityLabel = (review: Review): string =>
    ACTIVITIES.find(activity => activity.type === review.type)?.label ?? review.type.toUpperCase();

// Absence, not falsiness — a finished thing rated 0 was rated.
const ratingCaption = (review: Review): string | undefined =>
    review.rating != null ? `${review.rating} ★` : undefined;

/**
 * One row of a menu list: glyph, name, right-aligned value.
 *
 * The glyph is the Review's own cover rather than the reference's abstract
 * square — the same information in the same space, and the only art a row has
 * room for. The selected row inverts and steps left, which is how the
 * reference marks selection; the caret sits in the gutter outside the bar.
 */
const Row = ({ review, value, selected, onSelect }: {
    review: Review;
    value?: React.ReactNode;
    selected: boolean;
    onSelect: () => void;
}) => (
    <li className="relative">
        <span
            aria-hidden="true"
            className={`absolute -left-4 top-1/2 -translate-y-1/2 text-xs text-nier-text-dark transition-opacity duration-150 ${
                selected ? 'opacity-100' : 'opacity-0'
            }`}
        >
            ➤
        </span>
        <Link
            to={reviewPath(review)}
            onMouseEnter={onSelect}
            onFocus={onSelect}
            className={`nier-card group flex items-center gap-2 pl-1 pr-2 py-1 transition-all duration-150 focus:outline-none ${
                selected
                    ? 'bg-nier-text-dark -translate-x-1'
                    : 'bg-nier-150/60 hover:bg-nier-150'
            }`}
        >
            <span className="h-8 w-6 flex-shrink-0 overflow-hidden">
                <ReviewCover imagePath={review.image_path} fill />
            </span>
            <h3 className={`text-sm uppercase tracking-wide truncate ${
                selected ? 'text-nier-text-light' : 'text-nier-text-dark'
            }`}>
                {review.title}
            </h3>
            {value && (
                <span className={`ml-auto pl-3 text-xs uppercase tracking-wide flex-shrink-0 ${
                    selected ? 'text-nier-text-light/70' : 'text-nier-text-dark/60'
                }`}>
                    {value}
                </span>
            )}
        </Link>
    </li>
);

/**
 * A titled group of rows. The dark header bar is the reference's section
 * header — the same object as the panel's own title bar, one level in.
 */
const Section = ({ title, empty, children }: {
    title: string;
    /** Shown in place of the rows when there are none. */
    empty: string;
    children?: React.ReactNode;
}) => (
    <section aria-label={title}>
        <h2 className="bg-nier-dark text-nier-text-light text-xs uppercase tracking-widest px-2 py-1">
            {title}
        </h2>
        {children
            ? <ul className="flex flex-col gap-0.5 mt-1">{children}</ul>
            : <p className="text-nier-text-dark/50 text-sm px-2 py-2">{empty}</p>}
    </section>
);

/** One `label ......... value` line of the status readout. */
const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="uppercase tracking-wide text-nier-text-dark/70">{label}</span>
        <span className="uppercase text-nier-text-dark">{value}</span>
    </div>
);

/**
 * The detail pane. Shows the selected Review at a size the row cannot, and
 * deliberately holds no link of its own: the row is already the way in, and a
 * second control to the same place is one the eye has to rule out.
 */
const Detail = ({ review }: { review: Review }) => {
    const facts: [string, string][] = [
        ["Category", review.type],
        ["Status", review.status ?? "—"],
        ["Released", review.release_date?.trim() || "—"],
        ["Creator", review.creator?.trim() || "—"],
        ...(review.status === "done"
            ? ([
                ["Finished", review.date_completed?.trim() || "—"],
                ["Rating", ratingCaption(review) ?? "—"],
            ] as [string, string][])
            : []),
    ];

    return (
        <div className="flex flex-col gap-3">
            <div className="w-full max-w-48">
                <ReviewCover imagePath={review.image_path} full />
            </div>
            <h3 className="text-lg uppercase tracking-wide leading-tight">{review.title}</h3>
            <div className="flex flex-col gap-1 border-t border-nier-150 pt-2">
                {facts.map(([label, value]) => (
                    <Stat key={label} label={label} value={value} />
                ))}
            </div>
            {review.genres && review.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {review.genres.map(genre => (
                        <span key={genre} className="text-[10px] uppercase tracking-wide bg-nier-150/60 px-1.5 py-0.5">
                            {genre}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * The reference's ステータス box, in the one position it belongs.
 *
 * Deliberately NOT the site's readouts: the footer is already this site's
 * status panel — same four numbers, same `readoutsFor`, on every page, as a
 * landmark. Repeating them here would put the same figures on screen twice.
 * So this answers what the footer cannot, which is what those totals are made
 * of: how much of each Category is underway, against how much of it exists.
 */
const Shelves = ({ reviews }: { reviews: Review[] }) => {
    const shelves = ACTIVITIES.map(activity => {
        const all = reviews.filter(review => review.type === activity.type);
        return {
            label: activity.type,
            active: all.filter(review => review.status === 'active').length,
            total: all.length,
        };
    });

    return (
        <div className="flex flex-col">
            <h2 className="bg-nier-dark text-nier-text-light text-xs uppercase tracking-widest px-2 py-1">
                Shelves
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-nier-text-dark/40 px-2 pt-2 text-right">
                Underway / All
            </p>
            <div className="flex flex-col gap-1 px-2 py-2">
                {shelves.map(shelf => (
                    <Stat key={shelf.label} label={shelf.label} value={`${shelf.active} / ${shelf.total}`} />
                ))}
            </div>
            {/* The reference's row of empty slots. Furniture, and honest about
                it: there is nothing to put in them. */}
            <div aria-hidden="true" className="flex flex-wrap gap-1 px-2 pt-2 border-t border-nier-150">
                {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className="h-2 w-2 border border-nier-text-dark/40 mt-2" />
                ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-nier-text-dark/50 text-center py-4">
                No Error
            </p>
        </div>
    );
};

/** What the caption bar says about the selection. */
const captionFor = (review: Review | undefined): string => {
    if (!review) return "Nothing to show.";
    if (review.status === "active") return `${review.title} — in progress`;
    if (review.status === "todo") return `${review.title} — queued`;
    const finished = review.date_completed?.trim();
    return `${review.title} — finished${finished ? ` ${finished}` : ''}`;
};

const Now = () => {
    const { reviews, loading, error } = useReviews();
    const { active: contentActive } = useStageState('header');
    const panelStage = usePanelReveal(contentActive);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const decodedPanelTitle = useDecodeText('CURRENT VIEW PANEL', contentReady);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    // Keyed rather than held by object identity: the store replaces Review
    // objects on every refetch, and a stale reference would silently stop
    // matching anything the list is rendering.
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const keyOf = (review: Review) => `${review.type}-${review.slug}`;

    const inProgress = useMemo(
        () => ACTIVITIES.flatMap(activity =>
            reviews.filter(r => r.status === 'active' && r.type === activity.type),
        ),
        [reviews],
    );

    const queued = useMemo(
        () => reviews.filter(r => r.status === 'todo').slice(0, UP_NEXT_CAP),
        [reviews],
    );

    const recentlyFinished = useMemo(
        () => reviews
            .filter(r => r.status === 'done')
            .sort(byNewestCompleted)
            .slice(0, RECENTLY_FINISHED_CAP),
        [reviews],
    );

    // In list order, so "the first row" means the same thing to the detail
    // pane as it does to the eye.
    const listed = useMemo(
        () => [...inProgress, ...queued, ...recentlyFinished],
        [inProgress, queued, recentlyFinished],
    );

    // Nothing pointed at yet falls back to the first row rather than to an
    // empty pane: the panel should say something the moment it opens.
    const selected = listed.find(review => keyOf(review) === selectedKey) ?? listed[0];

    if (loading) return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
            <Loader />
        </div>
    );
    if (error) return <div>Error: Network error</div>;

    const rowProps = (review: Review) => ({
        review,
        selected: selected != null && keyOf(selected) === keyOf(review),
        onSelect: () => setSelectedKey(keyOf(review)),
    });

    return (
        <>
            {/* Reads "current"; the page is still Now — see CONTEXT.md. */}
            <PageHeader name="CURRENT" />
            <div className={`mt-5 relative ${contentActive ? '' : 'invisible'}`}>
                <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
                {/* A window, not a document: the frame takes the room that is
                    actually there and the contents scroll inside it. 42rem is
                    the most it wants; the cap is what is left below it. */}
                <article
                    ref={panelRef}
                    style={maxHeight ? { maxHeight } : undefined}
                    className={`nier-panel-frame relative bg-nier-100 flex flex-col h-[42rem] ${enterClass('nier-enter')} ${contentReady ? '' : 'invisible'}`}
                >
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                        <h3 className={`text-nier-text-dark text-xl uppercase ${contentReady ? '' : 'invisible'}`}>{decodedPanelTitle}</h3>
                    </div>

                    {/* min-h-0 so the columns scroll inside the frame instead
                        of stretching it — a flex child's default min-height is
                        its content, which would let the list push the panel
                        past the height its cap just worked out. */}
                    <div className="flex-1 min-h-0 flex gap-4 p-4">

                        {/* The gutter rail: two-tone, and the only thing left
                            of the list, exactly as the reference has it. */}
                        <div aria-hidden="true" className="w-1 flex-shrink-0 flex flex-col">
                            <span className="w-full flex-[2] bg-nier-shadow" />
                            <span className="w-full flex-[5] bg-nier-150/50" />
                        </div>

                        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-4 pl-4">
                            <Section title="In Progress" empty="Nothing in progress.">
                                {inProgress.length > 0 && inProgress.map(review => (
                                    <Row
                                        key={keyOf(review)}
                                        {...rowProps(review)}
                                        value={activityLabel(review)}
                                    />
                                ))}
                            </Section>

                            <Section title="Up Next" empty="Nothing queued up.">
                                {queued.length > 0 && queued.map(review => (
                                    <Row
                                        key={keyOf(review)}
                                        {...rowProps(review)}
                                        value={review.type}
                                    />
                                ))}
                            </Section>

                            <Section title="Recently Finished" empty="Nothing finished yet.">
                                {recentlyFinished.length > 0 && recentlyFinished.map(review => (
                                    <Row
                                        key={keyOf(review)}
                                        {...rowProps(review)}
                                        value={ratingCaption(review)}
                                    />
                                ))}
                            </Section>
                        </div>

                        {/* Both side columns are desktop-only. A phone has room
                            for the list and nothing else, and the list is the
                            part that answers the question the page exists for. */}
                        {selected && (
                            <div className="hidden lg:block w-56 flex-shrink-0 overflow-y-auto">
                                <Detail review={selected} />
                            </div>
                        )}

                        <div className="hidden md:block w-48 flex-shrink-0 overflow-y-auto bg-nier-100-lighter/40">
                            <Shelves reviews={reviews} />
                        </div>
                    </div>

                    {/* The caption bar. Says what is selected on the left and
                        how to act on it on the right — the reference's bottom
                        strip, accent block and all. */}
                    <div className="flex-shrink-0 border-t border-nier-150 flex items-center gap-3 px-4 py-2">
                        <span aria-hidden="true" className="w-1 h-5 bg-nier-dark flex-shrink-0" />
                        <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/70">
                            {captionFor(selected)}
                        </p>
                        <p className="ml-auto flex-shrink-0 text-xs uppercase tracking-wide text-nier-text-dark/50">
                            <span className="hidden sm:inline">↕ Select&nbsp;&nbsp;&nbsp;</span>◉ Open
                        </p>
                    </div>

                </article>
            </div>
        </>
    );
};

export default Now;
