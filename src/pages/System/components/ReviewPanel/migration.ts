// Derives the one-time migration of Review completion dates to one canonical
// key in one canonical format: `date_completed`, ISO, so it sorts as text and
// parses without anyone having to know which locale wrote it.
//
// Pure on purpose, for the same reason the Body migration is: the script that
// runs it prints the plan and writes nothing unless told to apply it, so the
// irreversible part is reviewable before it happens.

// The document shape this migration cares about. Reviews carry far more than
// this — everything else is none of its business, and naming it here would
// only invite the plan to touch it.
export type ReviewDoc = {
    _id?: string;
    slug?: string;
    title?: string;
    status?: string;
    date_completed?: string;
    // The camelCase key the spec expected to find orphaned in the data. No
    // document actually carries one, but folding it in is a few lines and
    // means the plan is correct if one ever turns up.
    dateCompleted?: string;
};

export type DateRewrite = {
    slug: string;
    title: string;
    from: string;
    to: string;
};

export type SkipReason = "unreadable" | "no-slug";

export type SkippedDate = {
    slug: string;
    title: string;
    value: string;
    reason: SkipReason;
};

export type DatePlan = {
    rewrites: DateRewrite[];
    skipped: SkippedDate[];
    isEmpty: boolean;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const US = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * The one place that decides what a stored completion date means. US
 * month-first, because that is what `toLocaleDateString('en-US')` wrote — the
 * ambiguity this migration exists to remove.
 *
 * Returns null for anything it cannot read, rather than a plausible guess.
 */
export function toIsoDate(value: string): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    if (ISO.test(trimmed)) return trimmed;

    const parts = US.exec(trimmed);
    if (!parts) return null;

    const [, month, day, year] = parts;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Rejects 02/30 and 13/01: Date rolls impossible values forward silently,
    // so the only reliable check is whether it survives the round trip.
    const parsed = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

// Canonical key wins when both are present; the legacy key is only consulted
// when the canonical one has nothing in it.
const storedDate = (doc: ReviewDoc): string =>
    doc.date_completed?.trim() || doc.dateCompleted?.trim() || "";

export function planDateMigration(docs: ReviewDoc[]): DatePlan {
    const rewrites: DateRewrite[] = [];
    const skipped: SkippedDate[] = [];

    for (const doc of docs) {
        const from = storedDate(doc);
        // No completion date is the correct state for anything unfinished —
        // not something to report, and not something to invent a date for.
        if (!from) continue;

        const title = doc.title ?? doc.slug ?? "";
        const to = toIsoDate(from);

        if (!to) {
            skipped.push({ slug: doc.slug ?? "", title, value: from, reason: "unreadable" });
            continue;
        }

        // update_post matches on slug. Without one there is no way to write
        // this document back, so it is reported rather than quietly dropped.
        if (!doc.slug) {
            skipped.push({ slug: "", title, value: from, reason: "no-slug" });
            continue;
        }

        // Already canonical, under the canonical key: nothing to do. This is
        // what makes a second run a no-op.
        if (to === doc.date_completed?.trim()) continue;

        rewrites.push({ slug: doc.slug, title, from, to });
    }

    return {
        rewrites,
        skipped,
        isEmpty: rewrites.length === 0 && skipped.length === 0,
    };
}
