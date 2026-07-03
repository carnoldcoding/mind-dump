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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Entry = {
    datetime: string;
    weightUsed?: number;
    weightGoal?: number;
    repsCompleted?: number;
    repGoal?: number;
    setsCompleted?: number;
    setGoal?: number;
};

type Props = {
    name: string;
    entries: Entry[];
};

type Metric = "weight" | "reps" | "volume";

const METRICS: { key: Metric; label: string }[] = [
    { key: "weight", label: "Weight" },
    { key: "reps",   label: "Reps"   },
    { key: "volume", label: "Volume" },
];

const METRIC_CONFIG: Record<Exclude<Metric, "volume">, {
    actual: keyof Entry;
    unit: string;
}> = {
    weight: { actual: "weightUsed",    unit: "lbs"  },
    reps:   { actual: "repsCompleted", unit: "reps" },
};

const MovementChart = ({ name, entries }: Props) => {
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

    const chartData = {
        labels,
        datasets: isVolume
            ? [
                {
                    label: "Volume (reps × weight)",
                    data: sorted.map(e =>
                        e.repsCompleted != null && e.weightUsed != null
                            ? e.repsCompleted * e.weightUsed
                            : null
                    ),
                    borderColor: "#48483D",
                    backgroundColor: "rgba(72, 72, 61, 0.08)",
                    pointBackgroundColor: "#48483D",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                },
            ]
            : [
                {
                    label: metric === "weight" ? "Weight Used" : "Reps",
                    data: sorted.map(e => (e[cfg!.actual] as number | undefined) ?? null),
                    borderColor: "#48483D",
                    backgroundColor: "rgba(72, 72, 61, 0.08)",
                    pointBackgroundColor: "#48483D",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                },
            ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    color: "#3A3A31",
                    font: { size: 11 },
                    boxWidth: 12,
                },
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
        `text-[10px] uppercase tracking-wide px-2.5 py-0.5 border cursor-pointer transition-colors ${
            active
                ? "bg-nier-text-dark text-nier-100-lighter border-nier-dark"
                : "border-nier-dark text-nier-text-dark/60 hover:text-nier-text-dark hover:bg-nier-150/40"
        }`;

    return (
        <div className="w-full h-64 bg-nier-100-lighter relative">
            <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-3">
                <span className="text-nier-text-dark text-sm uppercase tracking-wide">{name}</span>
                <div className="flex gap-1">
                    {METRICS.map(m => (
                        <button key={m.key} onClick={() => setMetric(m.key)} className={tabBtn(metric === m.key)}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
            <div className="w-full h-full px-4 pt-2 pb-10">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default MovementChart;
