// Body — the few places a record becomes text.

import type { LoggedSet, Movement, RoutineItem, Rule } from "../../../../types/body";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** 1 = Monday … 7 = Sunday, as the backend numbers them. */
export const weekdayName = (weekday: number) => WEEKDAYS[weekday - 1] ?? "";

/** "MONDAY — UPPER A", or "WEDNESDAY — REST" with no Workout due (R13). */
export function heading(weekday: number, workoutName: string | null): string {
    return `${weekdayName(weekday)} — ${workoutName ?? "Rest"}`.toUpperCase();
}

export const RULE_LABEL: Record<Rule, string> = {
    pastFailure: "Past failure",
    failure: "Failure only",
    noFailure: "No failure",
};

export function describeSet(movement: Movement, set: LoggedSet): string {
    let text: string;
    if (movement.kind === "hold") text = `${set.seconds ?? 0} s`;
    else if (movement.rule === "pastFailure") text = `${set.full ?? 0} full · ${set.partial ?? 0} partial · ${set.assisted ?? 0} assisted`;
    else text = `${set.full ?? 0} full`;
    return set.load != null ? `${text} @ ${set.load} lb` : text;
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
