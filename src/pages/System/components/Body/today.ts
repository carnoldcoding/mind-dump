// Body — which row of Today is selected, and what the hint bar says about it
// (body-today R6, R20–R21; body-flow R20–R22). Pure, so the order of a day is tested without
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
 * The row to select after a save in `saved`: the selection continues from the
 * row the user was on, and never returns to a row that the user passed over
 * while a row below is not done (body-flow R21, R22).
 *
 * 1. The saved row, if the save left it not done; inside a Pair, the Movement
 *    of the Pair with fewer Sets.
 * 2. Else the next row below that is not done.
 * 3. Else the first row above that is not done.
 * 4. Else no row.
 */
export function nextAfter(saved: RowId, { weighed, stretched, rows }: Day): RowId | null {
    // The Movement to log at row `i`: itself, or its Pair partner when that one has fewer Sets.
    const inPair = (i: number): RowId | null => {
        const pair = rows[i].slot.pair;
        const unit = pair == null ? [rows[i]] : rows.filter(r => r.slot.pair === pair);
        const open = unit.filter(r => !r.done);
        if (open.length === 0) return null;
        return open.reduce((least, r) => (r.sets.length < least.sets.length ? r : least)).movement._id;
    };
    const order: { id: RowId; pick: () => RowId | null }[] = [
        { id: WEIGHT, pick: () => (weighed ? null : WEIGHT) },
        { id: STRETCHES, pick: () => (stretched ? null : STRETCHES) },
        ...rows.map((r, i) => ({ id: r.movement._id, pick: () => inPair(i) })),
    ];
    const at = Math.max(order.findIndex(o => o.id === saved), 0);
    for (const o of [...order.slice(at), ...order.slice(0, at)]) {
        const id = o.pick();
        if (id !== null) return id;
    }
    return null;
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

/**
 * True where the pointer is a mouse. A field takes the keyboard on its own
 * only there: on a phone that would open the keyboard over the list each time
 * Today opens (body-flow R19).
 */
export const finePointer = (): boolean =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
