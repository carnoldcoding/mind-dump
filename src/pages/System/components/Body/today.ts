// Body — which row of Today is selected, and what the hint bar says about it
// (body-today R6–R11, R20–R21). Pure, so the order of a day is tested without
// a window.

import { nextUp } from "./session";
import type { Row } from "./session";

/** A row of Today: the Weigh-in, the Stretches, or a Movement by its id. */
export type RowId = string;
export const WEIGHT: RowId = "weight";
export const STRETCHES: RowId = "stretches";

export type Day = {
    weighed: boolean;
    stretched: boolean;
    /** The Movements of the Session, in Plan order. Empty on a day with no Workout. */
    rows: Row[];
};

/**
 * The first row that is not done, in the order of the day: the Weigh-in after
 * waking, then the Stretches, then the Session in Plan order. Null when the
 * day is complete.
 */
export function firstOpen({ weighed, stretched, rows }: Day): RowId | null {
    if (!weighed) return WEIGHT;
    if (!stretched) return STRETCHES;
    return nextUp(rows)?.movementId ?? null;
}

/**
 * What the selected row does, as the interface describing itself: flat, third
 * person, verb first (docs/chrome.md, "Hint bar").
 */
export function hintFor(selected: RowId | null, day: Day): string {
    if (selected === null) return firstOpen(day) === null ? "The day is complete." : "Shows the work of today.";
    if (selected === WEIGHT) return day.weighed ? "Replaces the bodyweight of today." : "Records the bodyweight of today.";
    if (selected === STRETCHES) return day.stretched ? "Clears the mark on the morning stretches." : "Marks the morning stretches done.";
    const row = day.rows.find(r => r.movement._id === selected);
    if (!row) return "";
    if (row.skipped) return `Returns ${row.movement.name} to the Session.`;
    return `Logs set ${row.sets.length + 1} of ${row.movement.name}.`;
}
