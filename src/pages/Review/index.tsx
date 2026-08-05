import PageHeader from "../../components/common/PageHeader";
import { ReviewCard } from "../../components/review/ReviewCard";
import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import Loader from "../../components/common/Loader";
import { useReviews, type Review as ReviewRecord } from "../../store/reviews";
import { byNewestCompleted } from "../../utils/completionDate";
import { toIsoDate } from "../System/components/ReviewPanel/migration";
import { rankByTitle } from "../../utils/rankByTitle";
import { useParams } from "react-router";
import { gameGenres, movieGenres, bookGenres } from "../../utils/helpers";
import { useLocation } from "react-router";
import { useStageState } from "../../context/BootSequenceContext";
import { useRevealTimeline } from "../../hooks/useRevealTimeline";
import { decode, domino, wipe } from "../../utils/motion";
import { usePanelHeight } from "../../hooks/usePanelHeight";
import { Panel } from "../../components/common/Panel";

// The rating scale, asserted in one place. Every rating stored is between 3
// and 4.5 with a decimal, so the scale is five points and the useful grain is
// a half — which is eleven cells, the same count as the reference's slot row.
// The stepper this replaced clamped 0–10 in whole numbers and so could not
// express a single value the collection actually holds.
const RATING_MAX = 5;
const RATING_STEP = 0.5;
const RATING_CELLS = Array.from({ length: RATING_MAX / RATING_STEP + 1 }, (_, i) => ({
    key: `${i * RATING_STEP}`,
    title: `${i * RATING_STEP} ★`,
}));

// The Category shelf's contextual line. A finished Review has a rating and a
// date it was finished; anything missing is simply left out rather than shown
// as a blank or a zero.
// Release dates are tracked in five-year spans. Decades were too coarse to
// separate a 2021 release from a 2029 one, and a cell per year over a
// collection reaching back to 1937 would be ninety of them.
const RELEASE_SPAN = 5;

/** The span a year belongs to, named by the year it opens. */
const spanStart = (year: number): number =>
    Math.floor(year / RELEASE_SPAN) * RELEASE_SPAN;

/** `1995–99`, or `2000–04` — the closing year short, since the opening one
 *  has already said which century it is. */
const spanLabel = (start: number): string =>
    `${start}–${`${start + RELEASE_SPAN - 1}`.slice(-2)}`;

const shelfLine = (review: Pick<ReviewRecord, "rating" | "date_completed">): string =>
    [
        review.rating != null ? `${review.rating} ★` : null,
        review.date_completed?.trim() || null,
    ].filter(Boolean).join('  ·  ');

/** One `label ......... value` line of the status readout. Same object as Now's. */
const Readout = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="uppercase tracking-wide text-nier-text-dark/70">{label}</span>
        <span className="uppercase text-nier-text-dark">{value}</span>
    </div>
);

/**
 * The reference's ステータス box, saying what the footer cannot.
 *
 * The footer's four numbers are collection-wide. This shelf is one Category,
 * and the question it raises is about that Category alone: how much of it is
 * here, how much of it the filters are letting through, and what it averages.
 * None of those figures appear anywhere else on the page.
 *
 * SHOWING is counted from the same array the grid renders, not from a second
 * pass over the filters — a count that can disagree with what is on screen is
 * worse than no count.
 */
const ShelfStatus = ({ shelved, showing, error }: {
    shelved: ReviewRecord[];
    showing: number;
    error: boolean;
}) => {
    // A Review rated 0 was rated; absence is `rating` not being a number at
    // all. Same distinction readoutsFor makes, for the same reason.
    const rated = shelved.filter(review => typeof review.rating === "number");
    const average = rated.length
        ? (rated.reduce((total, review) => total + (review.rating ?? 0), 0) / rated.length).toFixed(1)
        : null;
    const year = `${new Date().getFullYear()}`;
    const thisYear = shelved.filter(review => review.date_completed?.startsWith(year)).length;

    // Not 0: with nothing fetched, a zero claims the shelf is empty when what
    // is true is that we don't know.
    const unknown = "—";

    return (
        <div className="flex flex-col">
            <h2 className="bg-nier-dark text-nier-text-light text-xs uppercase tracking-widest px-2 py-1">
                Shelf
            </h2>
            <div className="flex flex-col gap-1 px-2 py-3">
                <Readout label="On shelf" value={error ? unknown : shelved.length} />
                <Readout label="Showing" value={error ? unknown : showing} />
                <Readout label="Rated" value={error ? unknown : rated.length} />
                <Readout label="Average" value={error || !average ? unknown : `${average} ★`} />
                <Readout label={year} value={error ? unknown : thisYear} />
            </div>
            {/* The reference's row of empty slots. Furniture, and honest about
                it: there is nothing to put in them. */}
            <div aria-hidden="true" className="flex flex-wrap gap-1 px-2 pt-2 border-t border-nier-150">
                {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className="h-2 w-2 border border-nier-text-dark/40 mt-2" />
                ))}
            </div>
            {/* The self-diagnostic line, and a real one: it says NO ERROR
                because it is capable of saying something else. */}
            <p className={`text-[10px] uppercase tracking-[0.3em] text-center py-4 ${
                error ? 'text-nier-text-dark' : 'text-nier-text-dark/50'
            }`}>
                {error ? 'Error' : 'No Error'}
            </p>
        </div>
    );
};

/**
 * What the caption bar says about the selection — or about why there isn't
 * one. Carries the fault as well as the status column, because that column is
 * desktop-only and a phone would otherwise be told nothing.
 */
const captionFor = (review: ReviewRecord | undefined, error: boolean, empty: boolean): string => {
    if (error) return "Collection unreachable — the API did not answer.";
    if (empty) return "No matching reviews.";
    if (!review) return "Select a review.";
    const line = shelfLine(review);
    return line ? `${review.title} — ${line}` : review.title;
};

/**
 * One genre, as a row of the reference's category list.
 *
 * The count is what selecting this row would leave on the shelf, so a row
 * reading 0 is one there is no point pressing — and it greys out in place
 * rather than disappearing, which is what the reference does with the item
 * categories you have nothing for. Vanishing rows would also make the column
 * jump under the pointer every time a range moved.
 *
 * A selected row stays live whatever its count, because pressing it is how you
 * get back out.
 */
const GenreRow = ({ genre, count, selected, onToggle }: {
    genre: string;
    count: number;
    selected: boolean;
    onToggle: () => void;
}) => {
    const dead = count === 0 && !selected;
    return (
        <li className="relative">
            <span
                aria-hidden="true"
                className={`absolute -left-3 top-1/2 -translate-y-1/2 text-[10px] text-nier-text-dark transition-opacity duration-150 ${
                    selected ? 'opacity-100' : 'opacity-0'
                }`}
            >
                ➤
            </span>
            <button
                onClick={onToggle}
                disabled={dead}
                aria-pressed={selected}
                className={`w-full flex items-center gap-2 px-2 py-1 text-left transition-all duration-150 ${
                    selected
                        ? 'bg-nier-text-dark -translate-x-1 cursor-pointer'
                        : dead
                            ? 'bg-nier-150/20 cursor-default'
                            : 'bg-nier-150/50 hover:bg-nier-150 cursor-pointer'
                }`}
            >
                {/* The reference's ■ bullet: filled on a live row, hollow on a
                    dead one. */}
                <span aria-hidden="true" className={`text-[8px] leading-none ${
                    selected ? 'text-nier-text-light' : dead ? 'text-nier-text-dark/25' : 'text-nier-text-dark/70'
                }`}>
                    {dead ? '□' : '■'}
                </span>
                <span className={`text-xs uppercase tracking-wide truncate ${
                    selected ? 'text-nier-text-light' : dead ? 'text-nier-text-dark/30' : 'text-nier-text-dark'
                }`}>
                    {genre}
                </span>
                <span className={`ml-auto pl-2 text-[10px] tabular-nums ${
                    selected ? 'text-nier-text-light/70' : dead ? 'text-nier-text-dark/25' : 'text-nier-text-dark/50'
                }`}>
                    {count}
                </span>
            </button>
        </li>
    );
};

/** A titled group in the filter column. The dark bar is the panel's own title
 *  bar, one level in — the same object the reference reuses at every depth. */
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title} className="flex flex-col min-h-0">
        <h2 className="bg-nier-dark text-nier-text-light text-[10px] uppercase tracking-widest px-2 py-1 flex-shrink-0">
            {title}
        </h2>
        {children}
    </section>
);

/**
 * A span selected on a segmented track — the one control this column uses for
 * every bounded metric, replacing a pair of steppers and a pair of native date
 * pickers.
 *
 * The reference has no slider and no date field, but it does have a bounded
 * value drawn as segments: the HP bar, and the row of empty slots that the
 * status column two columns to the right already carries as furniture. This
 * makes that furniture into the control.
 *
 * Two clicks make a span. The first sets an anchor and selects one cell; the
 * second closes the span between them, in either direction, so there is no
 * "from" that has to be before a "to" and no way to enter an inverted range.
 * A third click starts over. While the anchor is down, hovering outlines the
 * span you would get, which is the only affordance this needs — the alternative
 * is a legend explaining a control the reference would never have explained.
 *
 * Cells are points on the scale, not buckets: selecting one cell alone means
 * exactly that value. Ranges are what this is for, and a bucket reading would
 * make the two ends mean different things.
 */
const Track = ({ cells, selection, onChange, onClear, ticks, readout }: {
    /** One entry per cell, in scale order. The value is the caller's to read. */
    cells: { key: string; title: string }[];
    /** Selected span as cell indices, or null for no bound set. */
    selection: { min: number; max: number } | null;
    onChange: (span: { min: number; max: number }) => void;
    onClear: () => void;
    /** Labels under the ends of the track. */
    ticks: [string, string];
    /** What the current span reads as, in the metric's own units. */
    readout: string;
}) => {
    const [anchor, setAnchor] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);

    // While the anchor is down the track shows what you would get, not what
    // you have — so the preview wins over the selection for those cells.
    const preview = anchor !== null && hovered !== null
        ? { min: Math.min(anchor, hovered), max: Math.max(anchor, hovered) }
        : null;

    const press = (index: number) => {
        if (anchor === null) {
            setAnchor(index);
            onChange({ min: index, max: index });
        } else {
            onChange({ min: Math.min(anchor, index), max: Math.max(anchor, index) });
            setAnchor(null);
        }
    };

    const stateOf = (index: number): 'filled' | 'preview' | 'empty' => {
        if (preview && index >= preview.min && index <= preview.max) return 'preview';
        if (!preview && selection && index >= selection.min && index <= selection.max) return 'filled';
        return 'empty';
    };

    return (
        <div className="flex flex-col gap-1 pt-2">
            <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[10px] uppercase tracking-wide tabular-nums ${
                    selection ? 'text-nier-text-dark' : 'text-nier-text-dark/40'
                }`}>
                    {readout}
                </span>
                {selection && (
                    <button
                        onClick={() => { setAnchor(null); onClear(); }}
                        aria-label="Clear this range"
                        className="text-sm leading-none cursor-pointer text-nier-text-dark/50 hover:text-nier-text-dark transition-colors duration-150"
                    >×</button>
                )}
            </div>

            <div
                className="flex gap-px h-5"
                onMouseLeave={() => setHovered(null)}
            >
                {cells.map((cell, index) => {
                    const state = stateOf(index);
                    return (
                        <button
                            key={cell.key}
                            title={cell.title}
                            aria-label={cell.title}
                            aria-pressed={state === 'filled'}
                            onClick={() => press(index)}
                            onMouseEnter={() => setHovered(index)}
                            onFocus={() => setHovered(index)}
                            className={`flex-1 min-w-0 cursor-pointer transition-colors duration-100 ${
                                state === 'filled'
                                    ? 'bg-nier-dark'
                                    : state === 'preview'
                                        ? 'bg-nier-dark/40 border border-nier-dark'
                                        : 'border border-nier-text-dark/35 hover:bg-nier-150'
                            }`}
                        />
                    );
                })}
            </div>

            <div className="flex justify-between text-[9px] uppercase tracking-wide text-nier-text-dark/35">
                <span>{ticks[0]}</span>
                <span>{ticks[1]}</span>
            </div>
        </div>
    );
};

const Review = () => {
    const location = useLocation();
    // See Search/index.tsx — waits for the boot sequence's 'header' stage
    // before its first ever reveal, true immediately on every navigation
    // after that.
    const { active: contentActive } = useStageState('header');

    const searchParams = new URLSearchParams(location.search);
    const genreParam = searchParams.get('genre');

    // The whole collection, fetched once for the session; this page keeps the
    // Category filtering that used to be a `?type=` on its own request.
    const { reviews, loading, error } = useReviews();
    const [query, setQuery] = useState<string>('');
    const [genreOptions, setGenreOptions] = useState<string[]>([]);
    // Typed, unlike the rest of this page's older state: every number the
    // panel shows is counted off this array, and `any` would let a mistyped
    // field name count silently to zero.
    const [filteredPosts, setFilteredPosts] = useState<ReviewRecord[]>([]);
    // The filter column is permanent from `lg` up, where there is room for it
    // beside the grid. Below that it is an overlay, and this is what opens it.
    const [showFilters, setShowFilters] = useState<boolean>(false);
    // What the caption bar is talking about. Whatever the pointer or the
    // keyboard is on — the cards are anchors already, so Tab walks them and
    // Enter opens them without this page handling a key.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        dateReleasedRange: { active: false, start: '', end: '' },
        dateCompletedRange: { active: false, start: '', end: '' },
        ratingRange: { active: false, min: '', max: '' },
        genres: genreParam ? [genreParam] : []
    });
 
    const { category } = useParams<{category: string}>();
    // Hooks must run unconditionally, so these sit above the `if (!category)
    // return null` below even though category may briefly be undefined.
    // resetKey=category so this restarts fresh on every category switch —
    const panelTitle = `${category ?? ''} VIEW PANEL`.toUpperCase();
    const scope = useRef<HTMLDivElement>(null);

    // Review does not unmount between categories — React Router keeps the same
    // component instance and re-renders with new params — so the Fragment is
    // keyed on `category`, which remounts the panel and builds this afresh.
    // That is what the old resetKey argument was for.
    //
    // The frame wipes, its title decodes over the tail of that, and the shelf
    // dominoes in underneath. The stagger is the Domino primitive's own; the
    // version this replaces had to nominate the first card as a reporter and
    // hand-write a per-card delay to get the same overlap.
    useRevealTimeline(contentActive, (tl) => {
        wipe(tl, '[data-panel-surface]');
        decode(tl, '[data-panel-title]', panelTitle, '<0.15');
    }, scope);

    // The shelf gets its own timeline because it arrives on a different
    // signal: the frame's is built at mount, before the fetch has answered
    // and while there are no cards to address. Rebuilding one shared timeline
    // when the data lands would replay the frame's wipe underneath them.
    const shelfScope = useRef<HTMLDivElement>(null);
    useRevealTimeline(contentActive && !loading, (tl) => {
        domino(tl, '[data-shelf-card]');
    }, shelfScope, [loading]);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    const handleFieldChange = (field: string, value: any) => {
        setFilters(prev => ({
            ...prev, 
            [field]: value
        }))
    }

    const handleNestedFieldChange = (parentField: string, childField: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [parentField]: {
                ...prev[parentField as keyof typeof prev],
                [childField]: value
            }
        }))
    }

    const filterReviews = (posts : any) => {
        return posts.filter((review: any) => {
            // Date released filter. Release dates are still stored US-first,
            // so comparing them means converting first — through the same
            // reader the migration uses, rather than a second, unvalidated
            // copy of the conversion.
            if (filters.dateReleasedRange.start) {
                const releaseDate = toIsoDate(review.release_date);
                if (releaseDate && new Date(releaseDate) < new Date(filters.dateReleasedRange.start)) {
                    return false;
                }
            }
            if (filters.dateReleasedRange.end) {
                const releaseDate = toIsoDate(review.release_date);
                if (releaseDate && new Date(releaseDate) > new Date(filters.dateReleasedRange.end)) {
                    return false;
                }
            }

            // Date completed filter — both sides are ISO, so these compare as
            // plain strings without going through Date at all.
            const completedDate = review.date_completed?.trim();
            if (filters.dateCompletedRange.start) {
                if (completedDate && completedDate < filters.dateCompletedRange.start) {
                    return false;
                }
            }
            if (filters.dateCompletedRange.end) {
                if (completedDate && completedDate > filters.dateCompletedRange.end) {
                    return false;
                }
            }

            // Rating Range Filters
            if (filters.ratingRange.min && review.rating < parseFloat(filters.ratingRange.min)) {
                return false;
            }

            if (filters.ratingRange.max && review.rating > parseFloat(filters.ratingRange.max)) {
                return false;
            }

            // Genre Type Filters
            if (filters.genres.length > 0) {
                const hasAllGenres = filters.genres.every(genre => 
                    review.genres.includes(genre)
                );
                if (!hasAllGenres) return false;
            }

            return true;
        });
    }

    const clearFilters = () => {
        setFilters({
            dateReleasedRange: { active: false, start: '', end: '' },
            dateCompletedRange: { active: false,  start: '', end: '' },
            ratingRange: { active: false,  min: '', max: '' },
            genres: []
        });
        setFilteredPosts(shelved);
    }

    useEffect(()=>{
        clearFilters();
        setFilters((prev) => ({
            ...prev,
            genres: genreParam ? [genreParam] : []
        }))
        let tempGenres : string[] = [];
        
        if(location.pathname.includes('/games')) tempGenres = gameGenres;
        if(location.pathname.includes('/cinema')) tempGenres = movieGenres;
        if(location.pathname.includes('/books')) tempGenres = bookGenres;
        
        setGenreOptions(tempGenres);

    },[location.pathname])

    // Category comes from the URL in plural form; the `type` on a Review is
    // singular (see CONTEXT.md).
    const posts = useMemo(() => {
        if (!category) return [];
        const type = category.endsWith('s') ? category.slice(0, -1) : category;
        return reviews.filter(review => review.type === type);
    }, [reviews, category]);

    // A shelf is finished work (ADR-0004), and it is what every number on this
    // page counts against — so the search and the filters run over it too,
    // rather than over everything of this Category and then dropping the
    // unfinished ones at render. Two passes over different sets is how the
    // status column ends up disagreeing with the grid beside it.
    const shelved = useMemo(
        () => posts.filter(review => review.status === 'done'),
        [posts],
    );

    useEffect(() => {
        let result = query ? rankByTitle(shelved, query) : [...shelved];
        result = filterReviews(result);
        setFilteredPosts(result);
    }, [shelved, query, filters]);

    // What each genre row promises: how much of what is on screen right now
    // would survive selecting it. A row reading 0 is one there is nothing
    // behind, which is why it greys out — this is the number that says so.
    const genreCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const genre of genreOptions) {
            counts.set(genre, filteredPosts.filter(post => post.genres?.includes(genre)).length);
        }
        return counts;
    }, [genreOptions, filteredPosts]);

    // The five-year spans the shelf actually covers, not a fixed range — a
    // Category whose oldest thing is from 1994 has no business offering the
    // 1930s.
    const releaseSpans = useMemo(() => {
        const years = shelved
            .map(review => Number(toIsoDate(review.release_date ?? '')?.slice(0, 4)))
            .filter(year => Number.isFinite(year) && year > 0);
        if (years.length === 0) return [];
        const first = spanStart(Math.min(...years));
        const last = spanStart(Math.max(...years));
        return Array.from(
            { length: (last - first) / RELEASE_SPAN + 1 },
            (_, i) => first + i * RELEASE_SPAN,
        );
    }, [shelved]);

    // Every year between the first and last finish, gaps included: a track
    // that skipped an empty year would put two non-adjacent years side by
    // side and let a span silently cover something it doesn't show.
    const finishYears = useMemo(() => {
        const years = shelved
            .map(review => Number(review.date_completed?.trim().slice(0, 4)))
            .filter(year => Number.isFinite(year) && year > 0);
        if (years.length === 0) return [];
        const first = Math.min(...years);
        return Array.from({ length: Math.max(...years) - first + 1 }, (_, i) => first + i);
    }, [shelved]);

    // A span reads back off the filters rather than being held twice. The
    // filters are what actually narrows the shelf, so anything that sets them
    // — a `?genre=` link today, a saved view later — shows up on the tracks
    // without needing to know they exist.
    const spanOf = (from: string, to: string, indexOf: (value: string) => number) => {
        if (!from || !to) return null;
        const min = indexOf(from);
        const max = indexOf(to);
        return min < 0 || max < 0 ? null : { min, max };
    };

    const ratingSpan = spanOf(
        filters.ratingRange.min,
        filters.ratingRange.max,
        value => Math.round(parseFloat(value) / RATING_STEP),
    );

    const releasedSpan = spanOf(
        filters.dateReleasedRange.start,
        filters.dateReleasedRange.end,
        value => releaseSpans.indexOf(spanStart(Number(value.slice(0, 4)))),
    );

    const finishedSpan = spanOf(
        filters.dateCompletedRange.start,
        filters.dateCompletedRange.end,
        value => finishYears.indexOf(Number(value.slice(0, 4))),
    );

    /** Both bounds at once: a track sets a span, never a single end. */
    const setRange = (field: 'ratingRange' | 'dateReleasedRange' | 'dateCompletedRange',
                      bounds: [string, string]) =>
        setFilters(prev => ({
            ...prev,
            [field]: field === 'ratingRange'
                ? { ...prev.ratingRange, min: bounds[0], max: bounds[1] }
                : { ...prev[field], start: bounds[0], end: bounds[1] },
        }));

    const toggleGenre = (genre: string) =>
        handleFieldChange(
            'genres',
            filters.genres.includes(genre)
                ? filters.genres.filter(g => g !== genre)
                : [...filters.genres, genre],
        );

    useEffect(()=> {
        //Handle Active Filter State
        if(filters.ratingRange.min || filters.ratingRange.max) {
            handleNestedFieldChange('ratingRange', 'active', true);
        }else{
            handleNestedFieldChange('ratingRange', 'active', false);
        }
    
        if(filters.dateCompletedRange.start || filters.dateCompletedRange.end){
            handleNestedFieldChange('dateCompletedRange', 'active', true);
        }else{
            handleNestedFieldChange('dateCompletedRange', 'active', false);
        }

        if(filters.dateReleasedRange.start || filters.dateReleasedRange.end){
            handleNestedFieldChange('dateReleasedRange', 'active', true);
        }else{
            handleNestedFieldChange('dateReleasedRange', 'active', false);
        }
    },[filters.dateReleasedRange.start, filters.dateReleasedRange.end, 
        filters.ratingRange.min, filters.ratingRange.max,
        filters.dateCompletedRange.start, filters.dateReleasedRange.end])



    // Below every hook, not above half of them. React counts hooks by call
    // order, so a `return` in the middle of the list makes that order depend
    // on the URL — which is what seven rules-of-hooks errors in this file were
    // pointing at. Nothing above this line reads `category` without guarding.
    if (!category) return null;

    const renderContent = () => {
        // Sorted here rather than in the grid's JSX, because the caption bar
        // and the status column have to be looking at the same list in the
        // same order as the covers are.
        const shown = [...filteredPosts].sort(byNewestCompleted);
        const selected = shown.find(post => post._id === selectedId);

        const activeFilters =
            filters.genres.length
            + [filters.ratingRange, filters.dateReleasedRange, filters.dateCompletedRange]
                .filter(range => range.active).length;

        // The reference's category list: the rows are kinds, not items, and a
        // kind you have nothing for greys out where it stands. Below it, the
        // two things that have no row form — a bounded number and a pair of
        // dates — under section bars of their own.
        const filterColumn = (
            <div className="flex flex-col gap-4 min-h-0 h-full overflow-y-auto">
                <Group title="Genre">
                    <ul className="flex flex-col gap-0.5 mt-1 pl-3 max-h-52 min-h-0 overflow-y-auto">
                        {genreOptions.map(genre => (
                            <GenreRow
                                key={genre}
                                genre={genre}
                                count={genreCounts.get(genre) ?? 0}
                                selected={filters.genres.includes(genre)}
                                onToggle={() => toggleGenre(genre)}
                            />
                        ))}
                    </ul>
                </Group>

                <Group title="Rating">
                    <Track
                        cells={RATING_CELLS}
                        selection={ratingSpan}
                        ticks={['0', `${RATING_MAX}`]}
                        readout={ratingSpan
                            ? ratingSpan.min === ratingSpan.max
                                ? `${(ratingSpan.min * RATING_STEP).toFixed(1)} ★`
                                : `${(ratingSpan.min * RATING_STEP).toFixed(1)} — ${(ratingSpan.max * RATING_STEP).toFixed(1)} ★`
                            : 'Any rating'}
                        onChange={span => setRange('ratingRange', [
                            `${span.min * RATING_STEP}`,
                            `${span.max * RATING_STEP}`,
                        ])}
                        onClear={() => setRange('ratingRange', ['', ''])}
                    />
                </Group>

                {/* Absent on a shelf with nothing dated on it — a track with
                    no domain is a control that cannot narrow anything. */}
                {releaseSpans.length > 0 && (
                    <Group title="Released">
                        <Track
                            cells={releaseSpans.map(start => ({
                                key: `${start}`,
                                title: spanLabel(start),
                            }))}
                            selection={releasedSpan}
                            ticks={[
                                `${releaseSpans[0]}`,
                                `${releaseSpans[releaseSpans.length - 1] + RELEASE_SPAN - 1}`,
                            ]}
                            readout={releasedSpan
                                ? releasedSpan.min === releasedSpan.max
                                    ? spanLabel(releaseSpans[releasedSpan.min])
                                    : `${releaseSpans[releasedSpan.min]} — ${releaseSpans[releasedSpan.max] + RELEASE_SPAN - 1}`
                                : 'Any year'}
                            // A cell is a span, so it covers the whole of it:
                            // the first day of the one to the last day of the
                            // other.
                            onChange={span => setRange('dateReleasedRange', [
                                `${releaseSpans[span.min]}-01-01`,
                                `${releaseSpans[span.max] + RELEASE_SPAN - 1}-12-31`,
                            ])}
                            onClear={() => setRange('dateReleasedRange', ['', ''])}
                        />
                    </Group>
                )}

                {/* Only once there is more than one year to choose between.
                    Everything on the shelf having been finished in the same
                    year makes this a control that cannot change the answer,
                    and it comes back on its own when that stops being true. */}
                {finishYears.length > 1 && (
                    <Group title="Finished">
                        <Track
                            cells={finishYears.map(year => ({ key: `${year}`, title: `${year}` }))}
                            selection={finishedSpan}
                            ticks={[`${finishYears[0]}`, `${finishYears[finishYears.length - 1]}`]}
                            readout={finishedSpan
                                ? finishedSpan.min === finishedSpan.max
                                    ? `${finishYears[finishedSpan.min]}`
                                    : `${finishYears[finishedSpan.min]} — ${finishYears[finishedSpan.max]}`
                                : 'Any year'}
                            onChange={span => setRange('dateCompletedRange', [
                                `${finishYears[span.min]}-01-01`,
                                `${finishYears[span.max]}-12-31`,
                            ])}
                            onClear={() => setRange('dateCompletedRange', ['', ''])}
                        />
                    </Group>
                )}

                {/* Only there when there is something to undo. A permanent
                    Clear on an unfiltered shelf is a control that does
                    nothing, and the eye still has to rule it out. */}
                {activeFilters > 0 && (
                    <button
                        onClick={clearFilters}
                        className="flex-shrink-0 text-[10px] uppercase tracking-widest px-2 py-1.5 bg-nier-dark text-nier-text-light hover:bg-nier-text-dark cursor-pointer transition-colors duration-150"
                    >
                        Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                    </button>
                )}
            </div>
        );

        // The margin lives on Panel's wrapper rather than on the frame. It
        // used to sit on the article, where it margin-collapsed out through
        // the section around it — which had no padding or border to stop it —
        // while the absolutely positioned shadow kept its full 20px, landing
        // 22px low instead of 2px. With the margin on the wrapper neither box
        // can collapse away from the other.
        return (
          <Fragment key={category}>
          <Panel
                wrapperRef={scope}
                wrapperClassName="mt-5"
                className="bg-nier-100 h-[42rem]"
                style={maxHeight ? { maxHeight } : undefined}
                frameRef={panelRef}
            >
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                        <h3 data-panel-title className="text-nier-text-dark text-xl uppercase">{panelTitle}</h3>
                    </div>

                    {/* min-h-0 so the columns scroll inside the frame instead
                        of stretching it — a flex child's default min-height is
                        its content, which would let a long shelf push the
                        panel past the height its cap just worked out. */}
                    <div className="flex-1 min-h-0 flex gap-4 p-4">

                        {/* The gutter rail: two-tone, and the only thing left
                            of the content, exactly as the reference has it. */}
                        <div aria-hidden="true" className="w-1 flex-shrink-0 flex flex-col">
                            <span className="w-full flex-[2] bg-nier-shadow" />
                            <span className="w-full flex-[5] bg-nier-150/50" />
                        </div>

                        {/* Permanent from lg up, where there is room beside the
                            grid for it. */}
                        <div className="hidden lg:flex w-48 flex-shrink-0 flex-col min-h-0">
                            {filterColumn}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col">

                            {/* Search, as a menu line rather than a form
                                control: a label, a rule, and the text. The
                                reference has no search box to copy, but it has
                                plenty of labelled values, and that is what a
                                query is. */}
                            <div className="flex items-center gap-3 border-b border-nier-150 pb-2 mb-3 flex-shrink-0">
                                <label htmlFor="shelf-search" className="text-[10px] uppercase tracking-widest text-nier-text-dark/40 flex-shrink-0">
                                    Search
                                </label>
                                <input
                                    id="shelf-search"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="—"
                                    className="flex-1 min-w-0 bg-transparent text-sm uppercase tracking-wide focus:outline-none placeholder:text-nier-text-dark/25"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        aria-label="Clear search"
                                        className="text-lg leading-none cursor-pointer text-nier-text-dark/50 hover:text-nier-text-dark transition-colors duration-150"
                                    >×</button>
                                )}
                                {/* Below lg the filter column is an overlay,
                                    and this is the only way to it. */}
                                <button
                                    onClick={() => setShowFilters(true)}
                                    className={`lg:hidden flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-widest cursor-pointer transition-colors duration-150 flex-shrink-0 ${
                                        activeFilters > 0
                                            ? 'bg-nier-dark text-nier-text-light'
                                            : 'bg-nier-150/60 hover:bg-nier-150'
                                    }`}
                                >
                                    Filter{activeFilters > 0 ? ` · ${activeFilters}` : ''}
                                </button>
                            </div>

                            {/* The shelf fills in underneath a frame that is
                                already there. It used to be replaced by a
                                centred spinner while the fetch was in flight,
                                which threw the panel away and made the reveal
                                wait on network latency. See docs/motion.md. */}
                            <div ref={shelfScope} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1 items-start content-start">
                                {loading
                                    ? (
                                        <div className="col-span-full flex justify-center py-8">
                                            <Loader />
                                        </div>
                                    )
                                    : shown.length > 0
                                    ? shown.map((post) => (
                                        <div
                                            data-shelf-card
                                            className="w-full"
                                            key={post._id}
                                            // The caption bar's whole input.
                                            // onFocus rather than a key
                                            // handler: the card is an anchor,
                                            // so Tab already walks the shelf.
                                            onMouseEnter={() => setSelectedId(post._id)}
                                            onFocus={() => setSelectedId(post._id)}
                                        >
                                        {/* A shelf is finished work, so the line
                                            is what finishing produced: the rating
                                            and when it happened. Shown always,
                                            rather than only while a filter is
                                            active as it used to be. */}
                                        <ReviewCard review={post} caption={shelfLine(post)} />
                                        </div>
                                    ))
                                    : (
                                        <p className="col-span-full text-sm text-nier-text-dark/50 py-4">
                                            {/* With nothing fetched, "no matches"
                                                is a claim about the filters that
                                                isn't true — nothing was searched. */}
                                            {error ? 'Unavailable.' : 'No matching reviews.'}
                                        </p>
                                    )
                                }
                            </div>
                        </div>

                        <div className="hidden md:block w-44 flex-shrink-0 overflow-y-auto bg-nier-100-lighter/40">
                            <ShelfStatus shelved={shelved} showing={shown.length} error={!!error} />
                        </div>
                    </div>

                    {/* The caption bar. What is under the pointer on the left,
                        how to act on it on the right — the reference's bottom
                        strip, accent block and all. */}
                    <div className="flex-shrink-0 border-t border-nier-150 flex items-center gap-3 px-4 py-2">
                        <span aria-hidden="true" className="w-1 h-5 bg-nier-dark flex-shrink-0" />
                        <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/70">
                            {captionFor(selected, !!error, shown.length === 0)}
                        </p>
                        <p className="ml-auto flex-shrink-0 text-xs uppercase tracking-wide text-nier-text-dark/50">
                            <span className="hidden sm:inline">↕ Select&nbsp;&nbsp;&nbsp;</span>◉ Open
                        </p>
                    </div>

                </Panel>

                {/* Below lg the filter column has nowhere to stand, so it
                    arrives over the panel — the same column, not a second,
                    smaller set of controls that can drift from it. It is
                    `fixed`, so it does not need to sit inside the panel's
                    wrapper to land in the right place. */}
                {showFilters && (
                    <div
                        className="lg:hidden fixed inset-0 z-40 bg-nier-dark/40 flex items-start justify-center p-4 pt-20"
                        onClick={() => setShowFilters(false)}
                    >
                        <div className="relative w-full max-w-xs" onClick={e => e.stopPropagation()}>
                            <div aria-hidden="true" className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
                            <div className="relative bg-nier-100 flex flex-col max-h-[70vh]">
                                <div className="h-8 bg-nier-150 flex items-center justify-between px-3 flex-shrink-0">
                                    <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/70">Filter</span>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="text-xl leading-none cursor-pointer hover:opacity-60 transition-opacity"
                                    >×</button>
                                </div>
                                <div className="p-3 overflow-y-auto">
                                    {filterColumn}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
          </Fragment>
        );
      };

    return (
    <>
        <PageHeader name={category} />
        {renderContent()}
    </>
    )
}

export default Review;