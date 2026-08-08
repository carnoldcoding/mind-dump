// Narrowing and ordering Not Started.
//
// Pure, and separate from the window for the usual reason: this is where the
// wrong answer is invisible. A filter that quietly drops rows, or a sort that
// disagrees with the count beside it, looks like a short list rather than a
// fault.

import type { Review } from '../../../../store/reviews';
import { rankByTitle } from '../../../../utils/rankByTitle';
import { capturedAt, daysWaiting } from '../../../../utils/capturedAt';
import { CATEGORIES } from '../../../../utils/categories';

export type SortKey = 'waiting' | 'title' | 'release';

export type UnstartedControls = {
    /** Title text. Matched by rankByTitle, the same as every other search. */
    query: string;
    /** A Category, or null for all of them. */
    category: string | null;
    genre: string | null;
    creator: string | null;
    sort: SortKey;
    /** True for the default direction of the chosen key. */
    ascending: boolean;
};

export const NO_CONTROLS: UnstartedControls = {
    query: '',
    category: null,
    genre: null,
    creator: null,
    sort: 'waiting',
    ascending: true,
};

/**
 * Not Started, as the controls describe it.
 *
 * Every control narrows: they combine with AND, so two that share nothing come
 * back empty rather than falling back to whichever matched. An empty result is
 * a true answer to a narrow question, and the surface says so.
 *
 * Search runs last of the filters because it also orders — `rankByTitle` puts
 * a prefix match above a substring one, and that ranking is the point of
 * searching. An explicit sort key overrides it.
 */
export function applyControls(items: Review[], controls: UnstartedControls): Review[] {
    let result = items;

    if (controls.category) result = result.filter(r => r.type === controls.category);
    if (controls.genre) result = result.filter(r => (r.genres ?? []).includes(controls.genre!));
    if (controls.creator) result = result.filter(r => r.creator === controls.creator);
    if (controls.query) result = rankByTitle(result, controls.query);

    // A search already ordered what it matched, so with the default key and a
    // query the ranking stands. Reversing is still honoured either way — it is
    // an explicit instruction, and silently ignoring it while typing was a bug.
    const ordered = [...result];
    const rankingStands = controls.sort === 'waiting' && controls.query !== '';

    if (!rankingStands) ordered.sort(comparatorFor(controls.sort));
    if (!controls.ascending) ordered.reverse();

    return ordered;
}

/**
 * The default direction of each key is the one worth having first, not
 * alphabetical or numeric ascending — longest waiting, A to Z, newest release.
 * `ascending: false` flips whichever that is.
 */
function comparatorFor(sort: SortKey): (a: Review, b: Review) => number {
    if (sort === 'title') {
        return (a, b) => a.title.localeCompare(b.title);
    }

    if (sort === 'release') {
        // Missing dates sort last in the default direction rather than reading
        // as 1970 and taking the top. Reversing is a whole-array flip, so they
        // do come first when reversed — which is the honest consequence of
        // "unknown is not newest" rather than a second rule.
        return (a, b) => releaseTime(b) - releaseTime(a);
    }

    // Waiting: the longest-waiting first, on the same terms — an id carrying
    // no capture time is unknown rather than new.
    return byLongestWaiting;
}

/** Longest-waiting first. Shared, so the window and this cannot disagree. */
export const byLongestWaiting = (a: Review, b: Review): number =>
    (daysWaiting(b._id) ?? -1) - (daysWaiting(a._id) ?? -1);

function releaseTime(review: Review): number {
    const value = review.release_date?.trim();
    if (!value) return Number.NEGATIVE_INFINITY;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/** One option a control can offer, and how many rows choosing it would leave. */
export type Facet = { value: string | null; count: number };

export type Facets = {
    /** Every Category, in CATEGORIES order, with `null` first for all of them. */
    categories: Facet[];
    genres: Facet[];
    creators: Facet[];
};

/**
 * What each control can offer, counted against what the *other* controls
 * have already narrowed.
 *
 * Each control excludes itself from its own counts. Without that, choosing
 * GAMES would count every other Category against a set already filtered to
 * games and report them all as zero, so the rail would go blank the moment it
 * was used.
 *
 * Genres and creators offer only what is actually present, because an option
 * that returns nothing is a dead end. Categories are the exception: all of
 * them are always listed, including empty ones, so the rail keeps its shape —
 * the same rule the editor's section bar follows, in docs/chrome.md.
 */
export function facetsFor(items: Review[], controls: UnstartedControls): Facets {
    const without = (key: keyof UnstartedControls) =>
        applyControls(items, { ...controls, [key]: key === 'query' ? '' : null });

    const forCategories = without('category');
    const inCategory = applyControls(items, { ...controls, genre: null, creator: null });

    const tally = (rows: Review[], read: (r: Review) => string[]) => {
        const counts = new Map<string, number>();
        for (const row of rows) for (const value of read(row)) {
            if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        return [...counts.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    };

    return {
        categories: [
            { value: null, count: forCategories.length },
            ...CATEGORIES.map(category => ({
                value: category.type,
                count: forCategories.filter(r => r.type === category.type).length,
            })),
        ],
        genres: tally(inCategory, r => r.genres ?? []),
        creators: tally(inCategory, r => (r.creator ? [r.creator] : [])),
    };
}

/** What the Readout column reports about what is currently showing. */
export type UnstartedReadouts = {
    showing: number;
    /** Days the longest-queued row has waited, or null when nothing is showing. */
    oldest: number | null;
    medianWait: number | null;
    added30: number;
    started30: number;
};

const THIRTY_DAYS_MS = 30 * 86_400_000;

/**
 * Figures about what is showing, not about the collection.
 *
 * These deliberately do not repeat the rail. The rail already says how many
 * are in each Category, and CONTEXT.md is explicit that a surface's readouts
 * should answer what another surface cannot rather than putting the same
 * number on screen twice.
 *
 * `added30` against `started30` is the pair worth having: whether Not Started
 * is growing faster than it is being cleared. Both count the same window, and
 * `started30` counts across everything unfinished rather than across the
 * unstarted — starting something takes it out of the list this describes, so
 * counting it there could only ever return zero.
 */
export function unstartedReadouts(
    items: Review[],
    /**
     * Everything unfinished, Started included. `started30` has to count
     * against this rather than against `items`: a Review that started is no
     * longer `todo`, so counting it among the unstarted could only ever
     * return zero — which is exactly what it did.
     */
    unfinished: Review[],
    controls: UnstartedControls,
    now: Date = new Date(),
): UnstartedReadouts {
    const showing = applyControls(items, controls);

    // Rows whose id carries no capture time are excluded rather than counted
    // as waiting zero days — fixtures across this repo use ids like `id-Nioh`,
    // and a zero would drag the median toward nothing.
    const waits = showing
        .map(review => daysWaiting(review._id, now))
        .filter((days): days is number => days !== undefined)
        .sort((a, b) => a - b);

    const since = now.getTime() - THIRTY_DAYS_MS;

    return {
        showing: showing.length,
        oldest: waits.length ? waits[waits.length - 1] : null,
        medianWait: waits.length ? waits[Math.floor(waits.length / 2)] : null,
        added30: showing.filter(review => {
            const captured = capturedAt(review._id);
            return captured !== undefined && captured.getTime() >= since;
        }).length,
        // Narrowed the same way as the rest, minus the Status the list is
        // built on, so "added against started" compares like with like.
        started30: applyControls(unfinished, { ...controls, query: '' }).filter(review => {
            const value = review.date_started?.trim();
            if (!value) return false;
            const time = new Date(value).getTime();
            return !Number.isNaN(time) && time >= since;
        }).length,
    };
}
