// The one copy of the Review collection the app keeps. Every surface that
// needs Reviews reads it from here instead of fetching its own — see ADR-0005
// for why this is a store and not a third context provider.
//
// The store sits above the backend seam, not inside it: requests are still
// made in exactly one place (`src/api/backend.ts`), and this decides when.

import { useEffect } from "react";
import { create } from "zustand";
import { backend } from "../api/backend";

// Loose on purpose. `src/types/index.ts` is known to drift from the shapes the
// API actually returns (see docs/architecture.md), so this names the fields
// every surface relies on and lets the rest through untyped rather than
// pretending to an accuracy it doesn't have.
export type Review = {
    _id: string;
    slug: string;
    title: string;
    type: string;
    status?: string;
    rating?: number;
    genres?: string[];
    image_path?: string;
    release_date?: string;
    /** Canonical completion date: ISO `YYYY-MM-DD`, empty until finished. */
    date_completed?: string;
    [key: string]: unknown;
};

/** A Review's place in its lifecycle. See CONTEXT.md. */
export type ReviewStatus = "todo" | "active" | "done";

/**
 * The Backlog rule, in one place: everything not finished is on it, and a
 * Review leaves only by being finished. Membership is derived, never stored —
 * there is no Backlog flag on a Review (ADR-0004).
 */
export const isUnfinished = (review: Pick<Review, "status">): boolean =>
    review.status === "todo" || review.status === "active";

/** The other side of the same line: what the Category shelves and the System
 *  Reviews window show. */
export const isFinished = (review: Pick<Review, "status">): boolean =>
    review.status === "done";

type Status = "idle" | "loading" | "ready" | "error";

type ReviewsStore = {
    reviews: Review[];
    status: Status;
    /** Fetches once per session. A second caller joins the first one's request. */
    load: () => Promise<void>;
    /** Called after a System write, so the next read reflects it. */
    invalidate: () => Promise<void>;
};

// Module-level rather than store state: neither of these is anything a
// component should be able to render, and both have to survive the `set` calls
// they coordinate.
let inFlight: Promise<void> | null = null;
let generation = 0;

const initialState = { reviews: [] as Review[], status: "idle" as Status };

export const useReviewsStore = create<ReviewsStore>((set, get) => {
    // `initial` distinguishes the first fetch from a refresh. A refresh that
    // fails keeps the list already on screen — losing what you were looking at
    // because a background refetch dropped is worse than showing it slightly
    // stale, and there is only one writer to be stale relative to.
    const fetchReviews = async (initial: boolean): Promise<void> => {
        const mine = ++generation;

        const run = (async () => {
            try {
                const data = (await backend.getReviews()) as Review[];
                if (mine === generation) set({ reviews: data, status: "ready" });
            } catch {
                if (mine === generation && initial) set({ status: "error" });
            } finally {
                if (mine === generation) inFlight = null;
            }
        })();

        inFlight = run;
        return run;
    };

    return {
        ...initialState,

        load: async () => {
            if (get().status === "ready") return;
            if (inFlight) return inFlight;
            set({ status: "loading" });
            return fetchReviews(true);
        },

        invalidate: async () => fetchReviews(false),
    };
});

/**
 * Reads the collection, triggering the one fetch if it hasn't happened yet.
 *
 * `loading` covers `idle` too: a surface that mounts before the fetch starts
 * should show its loader, not an empty shelf that fills in a frame later.
 */
export function useReviews() {
    const reviews = useReviewsStore(s => s.reviews);
    const status = useReviewsStore(s => s.status);
    const load = useReviewsStore(s => s.load);

    useEffect(() => { load(); }, [load]);

    return {
        reviews,
        loading: status === "idle" || status === "loading",
        error: status === "error",
    };
}

/** Invalidate without subscribing — for write paths that don't read. */
export const invalidateReviews = () => useReviewsStore.getState().invalidate();

/**
 * Tests only. Module-level state outlives a single test the way component
 * state never did, so every suite that touches the store resets it in setup.
 */
export function resetReviewsStore() {
    inFlight = null;
    generation++;
    useReviewsStore.setState(initialState);
}
