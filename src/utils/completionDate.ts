// One definition of "when I finished this", so every surface that orders by
// it agrees. `date_completed` is canonical and ISO — see issue #18 and the
// migration in src/pages/System/components/ReviewPanel/migration.ts.

type HasCompletionDate = { date_completed?: string };

/**
 * Sortable time for a Review's completion date.
 *
 * Deliberately no fall back to release date: a shelf ordered by "when I
 * finished it" that silently means "when it came out" for unfinished things is
 * the bug this replaces. Anything not finished sorts to the bottom of a
 * newest-first list, which is where it belongs.
 */
export function completedTime(review: HasCompletionDate): number {
    const value = review.date_completed?.trim();
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

/** Newest-finished first. */
export const byNewestCompleted = (a: HasCompletionDate, b: HasCompletionDate): number =>
    completedTime(b) - completedTime(a);

/**
 * Today, in the canonical format, for the moment a Review is marked done.
 *
 * Local calendar date rather than UTC: "finished today" means the day it was
 * for the person clicking, who is the only person using this.
 */
export function todayIso(now: Date = new Date()): string {
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}
