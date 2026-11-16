// Body — edits to a Workout's slot list. The server takes the whole list in
// one write, so every change in the Plan view is one of these on the list it
// holds. A Pair is two neighbours that share a number; each edit keeps that
// true, because the server refuses a list where it is not.

import { moveItem } from "../../../../utils/reorder";
import type { Slot, Workout } from "../../../../types/body";

/** Clear any Pair whose two Movements are no longer next to each other. */
function dropBrokenPairs(slots: Slot[]): Slot[] {
    return slots.map((slot, i) => {
        if (slot.pair == null) return slot;
        const whole = slots[i - 1]?.pair === slot.pair || slots[i + 1]?.pair === slot.pair;
        return whole ? slot : { ...slot, pair: null };
    });
}

/**
 * Pair the Movement at `index` with the one below it, or clear the Pair it is
 * in. Nothing changes when there is no Movement below, or that one is paired.
 */
export function togglePair(slots: Slot[], index: number): Slot[] {
    const slot = slots[index];
    if (!slot) return slots;
    if (slot.pair != null) return slots.map(s => (s.pair === slot.pair ? { ...s, pair: null } : s));

    const below = slots[index + 1];
    if (!below || below.pair != null) return slots;
    const pair = Math.max(0, ...slots.map(s => s.pair ?? 0)) + 1;
    return slots.map((s, i) => (i === index || i === index + 1 ? { ...s, pair } : s));
}

/** The list after a drag from `from` to `to`. A Pair that the move splits is cleared. */
export function afterMove(slots: Slot[], from: number, to: number): Slot[] {
    return dropBrokenPairs(moveItem(slots, from, to));
}

export function removeSlot(slots: Slot[], index: number): Slot[] {
    return dropBrokenPairs(slots.filter((_, i) => i !== index));
}

/** Swap the Movement in place. Its Sets stay with the old Movement (R11). */
export function replaceSlot(slots: Slot[], index: number, movementId: string): Slot[] {
    return slots.map((s, i) => (i === index ? { ...s, movementId } : s));
}

export function addSlot(slots: Slot[], movementId: string): Slot[] {
    return [...slots, { movementId, pair: null }];
}

/** Where a slot sits in its Pair, so the two can be drawn as one bracket. */
export function pairEdge(slots: Slot[], i: number): "first" | "second" | null {
    const pair = slots[i]?.pair;
    if (pair == null) return null;
    if (slots[i + 1]?.pair === pair) return "first";
    if (slots[i - 1]?.pair === pair) return "second";
    return null;
}

/**
 * The Workout that is due next: today's, unless it is done; else the one on
 * the nearest later weekday. The Plan view opens on it (body-ui R18).
 */
export function nextWorkout(workouts: Workout[], weekday: number, dueDone: boolean): Workout | null {
    const daysAway = (w: Workout) => {
        const away = (w.weekday - weekday + 7) % 7;
        return away === 0 && dueDone ? 7 : away;
    };
    return [...workouts].sort((a, b) => daysAway(a) - daysAway(b))[0] ?? null;
}
