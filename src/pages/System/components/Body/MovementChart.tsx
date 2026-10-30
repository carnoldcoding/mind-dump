import { useState } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
} from "chart.js";
import type { Entry, Goal } from "./entry";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Props = {
    entries: Entry[];
    goal: Goal | null;
};

type Metric = "weight" | "reps" | "volume";

const METRICS: { key: Metric; label: string }[] = [
    { key: "weight", label: "Weight" },
    { key: "reps",   label: "Reps"   },
    { key: "volume", label: "Volume" },
];

const METRIC_CONFIG: Record<Exclude<Metric, "volume">, { actual: keyof Entry; unit: string }> = {
    weight: { actual: "weightUsed",    unit: "lbs"  },
    reps:   { actual: "repsCompleted", unit: "reps" },
};

// A Goal is a single current value, so it maps onto whichever metric is being
// viewed. Volume has no goal of its own — it's the product of the other two,
// so its target only exists when both do.
function goalFor(metric: Metric, goal: Goal | null): number | null {
    if (!goal) return null;
    if (metric === "weight") return goal.weight;
    if (metric === "reps") return goal.reps;
    return goal.reps != null && goal.weight != null ? goal.reps * goal.weight : null;
}

const MovementChart = ({ entries, goal }: Props) => {
    const [metric, setMetric] = useState<Metric>("volume");

    const isVolume = metric === "volume";
    const cfg = isVolume ? null : METRIC_CONFIG[metric];

    const sorted = [...entries]
        .filter(e => {
            if (isVolume) return e.repsCompleted != null && e.weightUsed != null;
            return e[cfg!.actual] != null;
        })
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    const labels = sorted.map(e =>
        new Date(e.datetime).toLocaleDateString([], { month: "short", day: "numeric" })
    );

    const unit = isVolume ? "" : cfg!.unit;
    const goalValue = goalFor(metric, goal);

    const actual = {
        label: isVolume ? "Volume (reps × weight)" : metric === "weight" ? "Weight Used" : "Reps",
        data: sorted.map(e =>
            isVolume
                ? (e.repsCompleted != null && e.weightUsed != null ? e.repsCompleted * e.weightUsed : null)
                : ((e[cfg!.actual] as number | undefined) ?? null)
        ),
        borderColor: "#48483D",
        backgroundColor: "rgba(72, 72, 61, 0.08)",
        pointBackgroundColor: "#48483D",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
    };

    // Only the current Goal is stored, so this reads flat across the whole
    // history rather than tracking what the target was at the time — see
    // ADR-0002. No points and no fill, so it reads as a target and not as a
    // second measurement.
    const goalLine = goalValue != null && sorted.length > 0 ? {
        label: "Goal",
        data: sorted.map(() => goalValue),
        borderColor: "#8A8570",
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        fill: false,
    } : null;

    const chartData = { labels, datasets: goalLine ? [actual, goalLine] : [actual] };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: { color: "#3A3A31", font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: {
                backgroundColor: "#48483D",
                titleColor: "#C4BEAC",
                bodyColor: "#C4BEAC",
                padding: 8,
                callbacks: {
                    label: (ctx: any) =>
                        ctx.parsed.y !== null
                            ? `${ctx.dataset.label}: ${ctx.parsed.y}${unit ? ` ${unit}` : ""}`
                            : "",
                },
            },
        },
        scales: {
            x: {
                grid: { color: "rgba(72, 72, 61, 0.08)" },
                ticks: { color: "#3A3A31", font: { size: 10 } },
            },
            y: {
                beginAtZero: false,
                grid: { color: "rgba(72, 72, 61, 0.08)" },
                ticks: {
                    color: "#3A3A31",
                    font: { size: 10 },
                    callback: (v: any) => unit ? `${v} ${unit}` : String(v),
                },
            },
        },
    };

    const tabBtn = (active: boolean) =>
        `text-eyebrow uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors ${
            active
                ? "bg-nier-text-dark text-nier-100-lighter border-nier-dark"
                : "border-nier-dark text-nier-text-dark/60 hover:text-nier-text-dark hover:bg-nier-150/40"
        }`;

    // The box around this — frame, shadow, the Chart / History strip — is
    // Body's. The metric switch only changes what is drawn, so it is a view
    // control and sits in a toolbar row (docs/chrome.md, "Controls").
    return (
        <>
            <ToolbarRow>
                {METRICS.map(m => (
                    <button key={m.key} onClick={() => setMetric(m.key)} className={tabBtn(metric === m.key)}>
                        {m.label}
                    </button>
                ))}
            </ToolbarRow>
            {/* data-reveal-own: a chart draws itself; a Cascade steps over it
                rather than animating a canvas. */}
            <div data-reveal-own className="w-full h-56 px-4 pt-2 pb-3">
                <Line data={chartData} options={options} />
            </div>
        </>
    );
};

export default MovementChart;
