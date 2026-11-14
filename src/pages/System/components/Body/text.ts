// Body — the few places a record becomes text.

import type { LoggedSet, Movement, RoutineItem, Rule } from "../../../../types/body";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** 1 = Monday … 7 = Sunday, as the backend numbers them. */
export const weekdayName = (weekday: number) => WEEKDAYS[weekday - 1] ?? "";

export const RULE_LABEL: Record<Rule, string> = {
    pastFailure: "Past failure",
    failure: "Failure only",
    noFailure: "No failure",
};

/** A Set as its number, with no words: "9" is full reps, "30 s" a hold, "12 @ 70" a loaded Set. */
export function describeSet(movement: Movement, set: LoggedSet): string {
    const text = movement.kind === "hold" ? `${set.seconds ?? 0} s` : `${set.full ?? 0}`;
    return set.load != null ? `${text} @ ${set.load}` : text;
}

export function describeRoutineItem(item: RoutineItem): string {
    const amount = item.seconds != null ? `${item.seconds} s` : `${item.reps} reps`;
    return item.sets > 1 ? `${item.sets} × ${amount}` : amount;
}

export const formatLb = (lb: number) => `${lb.toFixed(1)} lb`;

export function signedLb(lb: number): string {
    return `${lb > 0 ? "+" : ""}${lb.toFixed(1)} lb`;
}

/** "2026-11-09" → "Nov 9". Built from the parts, so no time zone moves the day. */
export function shortDate(date: string): string {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
}
