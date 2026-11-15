// Body — what a Session screen shows, worked out from the Plan and the Sets
// logged so far. Pure, so the order of a Session is tested without a window.

import type { LoggedSet, Movement, Session, SetValues, Slot, Workout } from "../../../../types/body";

export type Row = {
    slot: Slot;
    movement: Movement;
    /** The Sets of this Movement logged in this Session, in order. */
    sets: LoggedSet[];
    skipped: boolean;
    /** It has its Sets, or it was skipped. */
    done: boolean;
};

/** One row for each Movement of the Workout, in Plan order (R20). */
export function sessionRows(workout: Workout, movements: Movement[], session: Session | null): Row[] {
    const byId = new Map(movements.map(m => [m._id, m]));
    const rows: Row[] = [];
    for (const slot of workout.slots) {
        const movement = byId.get(slot.movementId);
        if (!movement) continue;
        const sets = session ? session.sets.filter(s => s.movementId === movement._id) : [];
        const skipped = session ? session.skipped.includes(movement._id) : false;
        rows.push({ slot, movement, sets, skipped, done: skipped || sets.length >= movement.sets });
    }
    return rows;
}

/**
 * The Set to log next. Movements come in Plan order; inside a Pair the next
 * Set goes to the Movement with fewer Sets, so the two alternate (R23).
 */
export function nextUp(rows: Row[]): { movementId: string; setNumber: number } | null {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const partner = row.slot.pair != null && rows[i + 1]?.slot.pair === row.slot.pair ? rows[i + 1] : null;
        const open = (partner ? [row, partner] : [row]).filter(r => !r.done);
        if (partner) i++;
        if (open.length === 0) continue;
        const pick = open.reduce((least, r) => (r.sets.length < least.sets.length ? r : least));
        return { movementId: pick.movement._id, setNumber: pick.sets.length + 1 };
    }
    return null;
}

/**
 * What the main field of a Set starts with: the same Set of the last Session,
 * so a repeat is one action and the number to beat is on screen (R22).
 */
export function prefill(movement: Movement, previous: { date?: string; sets: LoggedSet[] } | undefined, setNumber: number): string {
    if (!previous || previous.sets.length === 0) return "";
    const last = previous.sets[Math.min(setNumber, previous.sets.length) - 1];
    const value = movement.kind === "hold" ? last.seconds : last.full;
    return value == null ? "" : String(value);
}

const WHOLE = /^\d+$/;

/**
 * The number of a Set after a press on − or +. An empty field counts from 0,
 * and the number does not go below 1 (body-flow R10, R11). Text that is not a
 * whole number is left for the save to refuse.
 */
export function stepped(text: string, by: number): string {
    const t = text.trim();
    if (t !== "" && !WHOLE.test(t)) return text;
    if (t === "" && by < 0) return text;
    return String(Math.max((t === "" ? 0 : Number(t)) + by, 1));
}

export type SetFields = { full: string; seconds: string; load: string };

export const blankFields: SetFields = { full: "", seconds: "", load: "" };

function whole(text: string): number | null {
    const t = text.trim();
    return WHOLE.test(t) ? Number(t) : null;
}

/** The fields as the values a Set records, or the reason they are not one (R21). */
export function valuesFromFields(movement: Movement, fields: SetFields): { values?: SetValues; error?: string } {
    const values: SetValues = {};
    if (movement.kind === "hold") {
        const seconds = whole(fields.seconds);
        if (seconds == null || seconds < 1) return { error: "Enter the seconds" };
        values.seconds = seconds;
    } else {
        const full = whole(fields.full);
        if (full == null) return { error: "Enter the full reps" };
        if (full === 0) return { error: "A Set needs one rep or more" };
        values.full = full;
    }
    if (movement.loaded && fields.load.trim() !== "") {
        const load = Number(fields.load.trim());
        if (!Number.isFinite(load) || load <= 0) return { error: "Enter the load in pounds" };
        values.load = load;
    }
    return { values };
}

/** A logged Set as the text its fields would hold, for editing it. */
export function fieldsFromSet(set: LoggedSet): SetFields {
    const text = (n: number | undefined) => (n == null ? "" : String(n));
    return { full: text(set.full), seconds: text(set.seconds), load: text(set.load) };
}
