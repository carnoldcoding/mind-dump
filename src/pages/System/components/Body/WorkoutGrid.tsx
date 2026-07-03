import { useMemo, useState, useRef } from "react";
import { classifyEntry } from "./entry";

type Entry = { datetime: string; weightUsed?: number; repsCompleted?: number; setsCompleted?: number };

type Props = {
    entries: Entry[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCellColor(count: number): string {
    return count === 0 ? "#C6C2A5" : "#48483D";
}

type Cell = { date: string; count: number } | null;

const WorkoutGrid = ({ entries }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    const { weeks, monthLabels } = useMemo(() => {
        const dateMap = new Map<string, number>();
        entries
            .filter(e => classifyEntry(e) === "log")
            .forEach(e => {
                const d = new Date(e.datetime).toISOString().split("T")[0];
                dateMap.set(d, (dateMap.get(d) || 0) + 1);
            });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Anchor to the Sunday 52 weeks ago
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 52 * 7);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const weeks: Cell[][] = [];
        const monthLabels: { label: string; col: number }[] = [];
        const cur = new Date(startDate);
        let lastMonth = -1;

        while (cur <= today) {
            const week: Cell[] = [];
            for (let d = 0; d < 7; d++) {
                if (cur > today) {
                    week.push(null);
                } else {
                    const dateStr = cur.toISOString().split("T")[0];
                    if (d === 0) {
                        const month = cur.getMonth();
                        if (month !== lastMonth) {
                            monthLabels.push({
                                label: cur.toLocaleString("default", { month: "short" }),
                                col: weeks.length,
                            });
                            lastMonth = month;
                        }
                    }
                    week.push({ date: dateStr, count: dateMap.get(dateStr) || 0 });
                }
                cur.setDate(cur.getDate() + 1);
            }
            weeks.push(week);
        }

        return { weeks, monthLabels };
    }, [entries]);

    const handleMouseEnter = (cell: Cell, e: React.MouseEvent) => {
        if (!cell || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltip({
            text: `${cell.date} — ${cell.count} session${cell.count !== 1 ? "s" : ""}`,
            x: targetRect.left - containerRect.left + 8,
            y: targetRect.top - containerRect.top - 28,
        });
    };

    return (
        <div className="bg-nier-100-lighter relative" ref={containerRef}>
            <div className="h-7 w-full bg-nier-150 flex items-center px-3">
                <span className="text-nier-text-dark text-sm">Workout Frequency</span>
            </div>
            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />

            <div className="p-4 overflow-x-auto">
                {/* Month labels */}
                <div className="flex gap-[3px] mb-1 ml-7">
                    {weeks.map((_, wi) => {
                        const label = monthLabels.find(m => m.col === wi);
                        return (
                            <div key={wi} className="w-3 shrink-0 text-[9px] text-nier-text-dark/50 uppercase">
                                {label?.label ?? ""}
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-[3px]">
                    {/* Day-of-week labels */}
                    <div className="flex flex-col gap-[3px] mr-1 shrink-0">
                        {DAYS.map((d, i) => (
                            <div key={i} className="w-6 h-3 leading-3 text-[9px] text-nier-text-dark/50 uppercase">
                                {i % 2 === 1 ? d : ""}
                            </div>
                        ))}
                    </div>

                    {/* Cell columns */}
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px]">
                            {week.map((cell, di) => (
                                <div
                                    key={di}
                                    className="w-3 h-3 shrink-0"
                                    style={{ backgroundColor: cell ? getCellColor(cell.count) : "transparent" }}
                                    onMouseEnter={cell ? e => handleMouseEnter(cell, e) : undefined}
                                    onMouseLeave={() => setTooltip(null)}
                                />
                            ))}
                        </div>
                    ))}
                </div>

            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="absolute z-20 bg-nier-text-dark text-nier-100-lighter text-[10px] uppercase tracking-wide px-2 py-1 pointer-events-none whitespace-nowrap"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    {tooltip.text}
                </div>
            )}
        </div>
    );
};

export default WorkoutGrid;
