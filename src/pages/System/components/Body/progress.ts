// Body — the one Progress value the server does not send. The summary holds
// today's 7-day average; the chart needs that average at every Weigh-in.

import type { Point, WeighIn } from "../../../../types/body";

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
