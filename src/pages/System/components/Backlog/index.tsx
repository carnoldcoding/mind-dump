// The System folder that owns unfinished work: capture, grooming, deletion,
// and the todo → active → done transitions (ADR-0004).
//
// Capture asks for a title and a Category and nothing else. Everything heavier
// — critique, rating, screenshots — belongs to the Reviews window, which a
// Review reaches by being finished here.
//
// Laid out as a NieR menu screen rather than as two lists of titles, in the
// same grammar as the Category shelf and the Review detail. §3 collapsed the
// old Started / Not Started split into one list: Status is a facet, a sort key
// and a per-card glyph now, not a section boundary.
//
//   ┌ BACKLOG ──────────────────────────────────────────────┐
//   │ ＋ capture a title…      [game▾]      [ Capture ]      │
//   │ search…  [status:all▾] [sort:status▾] [↑] [? Pick]    │
//   │ ┌────────────────┐┌────────────────┐ │ STATE           │
//   │ │▩● SILENT       ││▩ FRIEREN       │ │ showing    3    │
//   │ │  ✦♪  86d       ││  —   197d      │ │ oldest   197d   │
//   │ │[qd|STARTED]Ed✕ ││[QUEUED|st]Ed✕  │ │ □□□□□□□□□□□      │
//   │ └────────────────┘└────────────────┘ │      NO ERROR   │
//   ├───────────────────────────────────────────────────────┤
//   │ ▌ Silent Hill — started, waiting 86 days              │
//   └───────────────────────────────────────────────────────┘
//
// ● marks a started card, so it reads at a glance in the mixed list.
//
// A card says which Critique sections have been written and never how many of
// four, because four is what a Category offers rather than a target it sets —
// see CONTEXT.md. A denominator here would be the interface imposing exactly
// the uniformity that shape exists to avoid.

import { useEffect, useMemo, useRef, useState } from "react";
import {
    useReviews,
    invalidateReviews,
    isUnfinished,
    type Review,
} from "../../../../store/reviews";
import { daysWaiting } from "../../../../utils/capturedAt";
import { writtenSections, SECTION_GLYPH } from "../../../../utils/critique";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade, domino, wipe } from "../../../../utils/motion";
import { Panel } from "../../../../components/common/Panel";
import { ReviewCover } from "../../../../components/review/ReviewCover";
import { ReviewModal } from "../ReviewPanel/ReviewModal";
import { Capture } from "./Capture";
import { UnstartedBar } from "./UnstartedBar";
import { applyControls, NO_CONTROLS, facetsFor, unstartedReadouts, type UnstartedControls, type UnstartedReadouts } from "./unstarted";

const TYPE_ICON: Record<string, string> = {
    game: 'game-controller-sharp',
    cinema: 'videocam-sharp',
    book: 'book-sharp',
};

// Declared outside the component: nested inside it, these were a fresh
// component type on every render, so React threw away and rebuilt every card on
// each keystroke in the capture field.
type CardActions = {
    onEdit: (review: Review) => void;
    onSelect: (review: Review) => void;
};

/** The year alone — a card has no room for a date and no use for the rest. */
const releaseYear = (review: Review): string | undefined =>
    review.release_date?.trim().slice(0, 4) || undefined;

/**
 * The marks for the Critique sections that exist.
 *
 * Only the written ones are drawn. A ghosted mark for an unwritten section
 * would read as an empty slot to fill, which is the same claim a fraction
 * makes and equally untrue: a game with nothing worth saying about story is
 * finished without a story section.
 */
const Written = ({ review, tone = 'dark' }: { review: Review; tone?: 'dark' | 'light' }) => {
    const written = writtenSections(review);
    // Nothing written draws nothing at all, rather than a dash standing in for
    // sections that were never a target — a dash makes the same claim a
    // fraction would (CONTEXT.md on Critique).
    if (written.length === 0) return null;
    return (
        <span
            aria-label="Sections written"
            title={written.join(', ')}
            className={`tracking-widest text-label ${
                tone === 'light' ? 'text-nier-text-light/80' : 'text-nier-text-dark/70'
            }`}
        >
            {written.map(section => SECTION_GLYPH[section] ?? '▪').join('')}
        </span>
    );
};

type CardProps = CardActions & { review: Review; selected: boolean };

const Card = ({ review, selected, onEdit, onSelect }: CardProps) => {
    const waiting = daysWaiting(review._id);
    const year = releaseYear(review);

    const started = review.status === 'active';
    // The card carries no controls now — every action lives in the editor, and
    // the whole card opens it. Status is shown, not changed, here.
    const statusLabel = started ? 'Started' : 'Queued';

    return (
        <li
            id={`backlog-card-${review.type}-${review.slug}`}
            data-backlog-card
            role="button"
            tabIndex={0}
            aria-label={`Open ${review.title}`}
            onClick={() => onEdit(review)}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onEdit(review);
                }
            }}
            onMouseEnter={() => { onSelect(review); }}
            onFocus={() => onSelect(review)}
            className={`nier-card group relative flex flex-col overflow-hidden cursor-pointer min-h-36 transition-shadow duration-150 ${
                selected ? 'ring-2 ring-inset ring-nier-text-light/70' : ''
            }`}
        >
            {/* The cover is the card — a poster, not a thumbnail. A missing one
                falls back to the khaki hatch, which reads as part of the set. */}
            <div aria-hidden="true" className="absolute inset-0">
                <ReviewCover imagePath={review.image_path} fill />
            </div>
            {/* Scrim: heaviest at the foot where the title sits, so it stays
                legible over any art, fading to almost nothing at the top. */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-nier-dark/95 via-nier-dark/50 to-nier-dark/5"
            />

            {/* Status as a corner tab: filled dark for started (reads first in a
                scan), a light chip for queued. The one per-card difference —
                every frame is otherwise identical. */}
            <span
                className={`absolute top-0 right-0 z-10 px-2 py-0.5 text-eyebrow uppercase tracking-widest leading-none ${
                    started ? 'bg-nier-dark text-nier-text-light' : 'bg-nier-100-lighter/85 text-nier-text-dark'
                }`}
            >{statusLabel}</span>

            {/* Title and meta pinned to the foot, over the scrim, in light ink. */}
            <div className="relative z-10 mt-auto flex flex-col gap-1 p-2.5">
                <h4 className="text-heading uppercase tracking-wide text-nier-text-light leading-tight">
                    <span className="line-clamp-2">{review.title}</span>
                </h4>

                <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-eyebrow uppercase tracking-wide text-nier-text-light/70 min-w-0">
                        <ion-icon
                            name={TYPE_ICON[review.type] ?? 'document-sharp'}
                            style={{ flexShrink: 0, fontSize: '11px', color: 'var(--color-nier-text-light)' }}
                        ></ion-icon>
                        <span className="truncate">
                            {review.type}
                            {year && <span aria-hidden="true"> · </span>}
                            {year}
                        </span>
                    </p>

                    <span className="flex items-center gap-2 flex-shrink-0">
                        <Written review={review} tone="light" />
                        {/* Absent rather than zero where the id carries no date:
                            an unreadable id means we don't know, not today. */}
                        {waiting !== undefined && (
                            <span className="text-eyebrow uppercase tracking-wide text-nier-text-light/60 whitespace-nowrap">
                                waiting {waiting}d
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </li>
    );
};

type BacklogListProps = CardActions & {
    items: Review[];
    selected: Review | undefined;
    /** True once the collection has arrived, to tell empty-of-all from
     *  empty-because-filtered. */
    hasUnfinished: boolean;
};

/**
 * The one list §3 collapses Started and Not Started into. Status is a facet,
 * a sort key and a per-card glyph now, not a section boundary — so a started
 * item and a queued one sit in the same grid, ordered by the controls.
 */
const BacklogList = ({ items, selected, hasUnfinished, ...actions }: BacklogListProps) => {
    if (items.length === 0) {
        return (
            <p className="text-body text-nier-text-dark/40 px-2 py-6">
                {hasUnfinished ? 'Nothing matches those controls.' : 'Nothing on the backlog.'}
            </p>
        );
    }

    return (
        <ul
            aria-label="Backlog"
            data-backlog-shelf
            data-reveal-own
            className="grid grid-cols-1 md:grid-cols-2 gap-2"
        >
            {items.map(review => (
                <Card
                    key={`${review.type}-${review.slug}`}
                    review={review}
                    selected={selected !== undefined && keyOf(selected) === keyOf(review)}
                    {...actions}
                />
            ))}
        </ul>
    );
};

/** One `label ......... value` line of the state readout. */
const Readout = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 text-label">
        <span className="uppercase tracking-wide text-nier-text-dark/70">{label}</span>
        <span className="uppercase text-nier-text-dark">{value}</span>
    </div>
);

/**
 * The reference's ステータス box, saying what this folder is carrying.
 *
 * Deliberately no figure about Critique sections. A count across the Backlog
 * would only be interesting against a total, and there is no total to be
 * against — so the sections stay on the cards, where they say which rather
 * than how many.
 *
 * Shares its column with the picked Review's detail. It shows when nothing is
 * picked, which is when the list rather than one row is what you are looking
 * at.
 */
const State = ({ readouts, error }: {
    readouts: UnstartedReadouts;
    /** A write that failed, or a collection that never arrived. */
    error: boolean;
}) => {
    return (
        <div aria-label="Backlog state" className="flex flex-col">
            <h3 className="bg-nier-dark text-nier-text-light text-eyebrow uppercase tracking-widest px-2 py-1">
                State
            </h3>
            {/* No per-Category counts: the rail carries those, and CONTEXT.md
                is explicit that a surface's readouts should answer what
                another cannot rather than say the same thing twice. These
                describe the list as filtered, and how it is behaving. */}
            <div className="flex flex-col gap-1 px-2 py-3">
                <Readout label="Showing" value={readouts.showing} />
                <Readout label="Oldest" value={readouts.oldest === null ? '—' : `${readouts.oldest}d`} />
                <Readout label="Median wait" value={readouts.medianWait === null ? '—' : `${readouts.medianWait}d`} />
            </div>
            {/* The pair worth having together: whether the list is growing
                faster than it is being cleared. Same window, so they can be
                read against each other. */}
            <div className="flex flex-col gap-1 px-2 py-3 border-t border-nier-150">
                <Readout label="Added 30d" value={readouts.added30} />
                <Readout label="Started 30d" value={readouts.started30} />
            </div>
            <div aria-hidden="true" className="flex flex-wrap gap-1 px-2 pt-2 border-t border-nier-150">
                {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className="h-2 w-2 border border-nier-text-dark/40 mt-2" />
                ))}
            </div>
            {/* The self-diagnostic, and a real one: it reads NO ERROR because
                it is capable of reading something else. The message itself
                stays above the cards, where it is next to what failed; this
                is the standing indicator that something did. */}
            <p className={`text-eyebrow uppercase tracking-[0.3em] text-center py-4 ${
                error ? 'text-nier-text-dark' : 'text-nier-text-dark/50'
            }`}>
                {error ? 'Error' : 'No Error'}
            </p>
        </div>
    );
};

/** A Review's identity on this screen. Slug alone is not one: two Categories
 *  can hold the same slug. */
const keyOf = (review: Review) => `${review.type}-${review.slug}`;

/**
 * What the caption bar says — about the selection, or about the folder when
 * there is no selection, which on a touch device is always.
 */
const captionFor = (review: Review | undefined, hasError: boolean, waitingOn: Review[]): string => {
    if (hasError) return "Couldn't load the backlog.";
    if (!review) {
        if (waitingOn.length === 0) return "Nothing on the backlog.";
        const oldest = daysWaiting(waitingOn[0]._id);
        return oldest !== undefined
            ? `${waitingOn.length} unfinished — longest waiting ${oldest} days`
            : `${waitingOn.length} unfinished`;
    }
    const waiting = daysWaiting(review._id);
    const state = review.status === 'active' ? 'started' : 'not started';
    return waiting !== undefined
        ? `${review.title} — ${state}, waiting ${waiting} days`
        : `${review.title} — ${state}`;
};

const BacklogWindow = () => {
    const { reviews, error: fetchError } = useReviews();
    // No signal to wait on: this window mounts well after boot, from a folder
    // icon on the Desktop. No decoded title and no card grid either, so its
    // whole entrance is the frame arriving with its chrome a beat behind.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
    }, scope);

    // The shelves themselves. Their own timeline and their own readiness,
    // because the cards arrive with the collection rather than with the frame
    // — a timeline built at mount would address nothing, and go on addressing
    // nothing once they turned up. They carry data-reveal-own, so the window
    // Cascade steps over them and leaves this Domino to run.
    const shelvesScope = useRef<HTMLDivElement>(null);
    useRevealTimeline(reviews.length > 0, (tl) => {
        domino(tl, '[data-backlog-shelf] > li');
    }, shelvesScope, [reviews.length > 0]);
    const panelRef = useRef<HTMLElement>(null);

    // The frame Wipes as stable chrome; the window then Cascades so nothing else
    // arrives un-animated (ADR-0012). Keyed on the collection size so the chrome
    // and captions re-cascade once the reviews land.
    useRevealTimeline(true, (tl) => {
        if (panelRef.current) cascade(tl, panelRef.current, 0.15);
    }, scope, [reviews.length]);

    const [editing, setEditing] = useState<Review | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    // Two Categories can hold the same slug — a game and a film of it — and
    // the cards key on both, so selection has to as well.
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const unfinished = useMemo(
        () => reviews.filter(isUnfinished),
        [reviews],
    );

    // One list now, not two. Started and queued items sit in the same grid;
    // the controls decide what shows and in what order, with the default
    // (started first, then longest-waiting) keeping "what am I on" at the top
    // without a pinned section (spec §3a).
    const [controls, setControls] = useState<UnstartedControls>(NO_CONTROLS);
    const searchRef = useRef<HTMLInputElement>(null);
    // The search/filter region lives inside the Capture box, collapsed until
    // the funnel toggle reveals it.
    const [filtersOpen, setFiltersOpen] = useState(false);
    // Any narrowing filter set — so the collapsed toggle can mark itself. Sort
    // and direction are ordering, not narrowing, so they don't count here.
    const filtersActive =
        controls.query !== '' || controls.status !== 'all' ||
        controls.category !== null || controls.genre !== null || controls.creator !== null;

    const listed = useMemo(() => applyControls(unfinished, controls), [unfinished, controls]);
    const facets = useMemo(() => facetsFor(unfinished, controls), [unfinished, controls]);
    const readouts = useMemo(
        () => unstartedReadouts(unfinished, unfinished, controls),
        [unfinished, controls],
    );

    const changeControls = (next: Partial<UnstartedControls>) => setControls(prev => ({ ...prev, ...next }));

    // The search box lives in the collapsible region, so it isn't in the DOM
    // until the region opens. Focus it the moment it does, so revealing the
    // filters lands the caret ready to type — the fastest way into a long list.
    useEffect(() => {
        if (filtersOpen) searchRef.current?.focus();
    }, [filtersOpen]);

    /** Move the highlight through what is showing, and keep it in view. */
    const moveCursor = (delta: number) => {
        if (listed.length === 0) return;
        const at = listed.findIndex(review => keyOf(review) === selectedKey);
        const next = at === -1
            ? listed[delta > 0 ? 0 : listed.length - 1]
            : listed[Math.min(Math.max(at + delta, 0), listed.length - 1)];
        setSelectedKey(keyOf(next));
        document.getElementById(`backlog-card-${keyOf(next)}`)?.scrollIntoView({ block: 'nearest' });
    };

    const onListKey = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); moveCursor(1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); moveCursor(-1); }
        else if (event.key === 'Escape' && controls.query) { event.preventDefault(); changeControls({ query: '' }); }
        // The card carries its own Start/Edit/Remove, so Enter's job is only to
        // move focus onto the highlighted card — from there Tab reaches those
        // actions without a pointer.
        // The card has no controls of its own now — Enter opens the editor,
        // which is where every action lives.
        else if (event.key === 'Enter' && selected) {
            event.preventDefault();
            openEdit(selected);
        }
    };

    // Picks from what is showing rather than from the whole list, so a filter
    // is a way of narrowing what you are willing to be given.
    const pickAtRandom = () => {
        if (listed.length === 0) return;
        const chosen = listed[Math.floor(Math.random() * listed.length)];
        setSelectedKey(keyOf(chosen));
        document.getElementById(`backlog-card-${keyOf(chosen)}`)?.scrollIntoView({ block: 'center' });
    };

    // No fallback to the first card. Selection here means "what the pointer is
    // on" (or the keyboard cursor), and defaulting drew one card highlighted
    // and described it in the caption before anything had been touched — which
    // on a phone, where there is no pointer to move, is the only thing it would
    // ever say.
    const selected = listed.find(review => keyOf(review) === selectedKey);

    const openEdit = (review: Review) => {
        setEditing(review);
        setEditorOpen(true);
    };

    const actions = {
        onEdit: openEdit,
        onSelect: (review: Review) => setSelectedKey(keyOf(review)),
    };

    return (
        <>
        <Panel
            wrapperRef={scope}
            wrapperClassName="h-full"
            className="bg-nier-100 border border-nier-150 h-full"
            frameRef={panelRef}
        >
                <div ref={shelvesScope} className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

                    {/* The control strip. Capture leads it as the one control
                        that adds; the search/filters that narrow the one list
                        live inside it, revealed by its funnel toggle (spec §3b). */}
                    <Capture
                        reviews={reviews}
                        expanded={filtersOpen}
                        onToggleExpand={() => setFiltersOpen(open => !open)}
                        filtersActive={filtersActive}
                    >
                        <UnstartedBar
                            controls={controls}
                            categories={facets.categories}
                            statuses={facets.statuses}
                            genres={facets.genres}
                            creators={facets.creators}
                            onChange={changeControls}
                            onRandom={pickAtRandom}
                            searchRef={searchRef}
                            onListKey={onListKey}
                        />
                    </Capture>

                    <div className="relative flex gap-4 min-h-0">
                        <div className="flex-1 min-w-0">
                            <BacklogList
                                items={listed}
                                selected={selected}
                                hasUnfinished={unfinished.length > 0}
                                {...actions}
                            />
                        </div>

                        {/* The state readout, describing the whole list as the
                            controls have narrowed it. Desktop-only; the caption
                            bar carries the fault for a phone. */}
                        <div className="hidden md:block w-44 flex-shrink-0 bg-nier-100-lighter/40">
                            <State readouts={readouts} error={fetchError} />
                        </div>
                    </div>
                </div>

                {/* The caption bar. Says what is under the pointer, and carries
                    the fault as well, because the state column is desktop-only
                    and a phone would otherwise be told nothing. */}
                <div className="relative flex-shrink-0 flex items-center gap-3 px-4 py-2">
                    <span data-hairline aria-hidden="true" className="absolute top-0 left-0 w-full h-px bg-nier-150 origin-left" />
                    <span aria-hidden="true" className="w-1 h-5 bg-nier-dark flex-shrink-0" />
                    <p className="text-label uppercase tracking-wide truncate text-nier-text-dark/70">
                        {captionFor(selected, fetchError, listed)}
                    </p>
                </div>
        </Panel>

        {/* The heavier fields, asked for at the stage that needs them
            (story 2) — the same editor the Reviews window uses. */}
        <ReviewModal
            isOpen={editorOpen}
            setIsOpen={setEditorOpen}
            onReviewAdded={() => { invalidateReviews(); setEditing(null); }}
            editingReview={editing}
        />
        </>
    );
};

export default BacklogWindow;
