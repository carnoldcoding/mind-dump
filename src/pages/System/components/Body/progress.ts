// Body — what the Progress view works out for itself: the order of its list,
// the range of a chart, the line of the hint bar. The numbers are the
// server's (ADR-0013), with one exception: the summary holds today's 7-day
// average, and the chart needs that average at every Weigh-in.

import type { BodySummary, Movement, Plan, Point, WeighIn } from "../../../../types/body";

const DAY = 24 * 60 * 60 * 1000;

function dayNumber(date: string): number {
    const [y, m, d] = date.split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

/** For each Weigh-in: the average of it and the Weigh-ins of the 6 days before it. */
export function rollingAverage(weighins: WeighIn[]): Point[] {
    const sorted = [...weighins].sort((a, b) => (a.date < b.date ? -1 : 1));
    return sorted.map(w => {
        const day = dayNumber(w.date);
        const window = sorted.filter(x => {
            const back = day - dayNumber(x.date);
            return back >= 0 && back <= 6;
        });
        const average = window.reduce((sum, x) => sum + x.lb, 0) / window.length;
        return { date: w.date, value: Math.round(average * 10) / 10 };
    });
}

/** The fixed rows of the Progress list. Any other id is a Movement. */
export const OVERVIEW = "overview";
export const WEEKS = "weeks";
export const WEIGHT = "weight";

/**
 * The Movements of the Progress list (panes R17): in Plan order, a Movement of
 * two Workouts one time; then a Movement that is in no Workout, only if it
 * has a Set — it is history, and Progress is where history is read.
 */
export function progressOrder(plan: Plan, movements: Movement[], bests: BodySummary["bests"]): Movement[] {
    const byId = new Map(movements.map(m => [m._id, m]));
    const seen = new Set<string>();
    const out: Movement[] = [];
    for (const workout of [...plan.workouts].sort((a, b) => a.weekday - b.weekday)) {
        for (const slot of workout.slots) {
            const movement = byId.get(slot.movementId);
            if (!movement || seen.has(movement._id)) continue;
            seen.add(movement._id);
            out.push(movement);
        }
    }
    for (const movement of movements) {
        if (!seen.has(movement._id) && (bests[movement._id]?.sets ?? 0) > 0) out.push(movement);
    }
    return out;
}

export type Range = "4w" | "12w" | "all";
const RANGE_DAYS: Record<Range, number | null> = { "4w": 28, "12w": 84, all: null };

/** The Weigh-ins of the last 4 or 12 weeks, today included, or all of them. */
export function inRange(weighins: WeighIn[], today: string, range: Range): WeighIn[] {
    const days = RANGE_DAYS[range];
    if (days === null) return weighins;
    const end = dayNumber(today);
    return weighins.filter(w => {
        const back = end - dayNumber(w.date);
        return back >= 0 && back < days;
    });
}

/** What the selected row shows, as the interface describing itself (docs/chrome.md, "Hint bar"). */
export function progressHint(selected: string, movement: Movement | undefined): string {
    if (selected === OVERVIEW) return "Shows where the Phase is now.";
    if (selected === WEEKS) return "Shows each week of the Plan.";
    if (selected === WEIGHT) return "Shows the bodyweight against the target.";
    return movement ? `Shows each Session of ${movement.name}.` : "";
}
