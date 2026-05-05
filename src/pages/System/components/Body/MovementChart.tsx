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
    setsCompleted?: number;
};

type Props = {
    name: string;
    entries: Entry[];
};

const MovementChart = ({ name, entries }: Props) => {
    const sorted = [...entries]
        .filter(e => e.weightUsed != null || e.weightGoal != null)
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    const labels = sorted.map(e =>
        new Date(e.datetime).toLocaleDateString([], { month: "short", day: "numeric" })
    );

    const chartData = {
        labels,
        datasets: [
            {
                label: "Weight Used",
                data: sorted.map(e => e.weightUsed ?? null),
                borderColor: "#48483D",
                backgroundColor: "rgba(72, 72, 61, 0.08)",
                pointBackgroundColor: "#48483D",
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2,
                tension: 0.3,
                fill: true,
            },
            {
                label: "Weight Goal",
                data: sorted.map(e => e.weightGoal ?? null),
                borderColor: "#A9A38B",
                backgroundColor: "transparent",
                pointBackgroundColor: "#A9A38B",
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 1.5,
                borderDash: [5, 4],
                tension: 0.3,
                fill: false,
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
                        ctx.parsed.y !== null ? `${ctx.dataset.label}: ${ctx.parsed.y} lbs` : "",
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
                    callback: (v: any) => `${v} lbs`,
                },
            },
        },
    };

    return (
        <div className="w-full h-64 bg-nier-100-lighter relative">
            <div className="h-7 w-full bg-nier-150 flex items-center px-3">
                <span className="text-nier-text-dark text-sm uppercase tracking-wide">{name}</span>
            </div>
            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
            <div className="w-full h-full px-4 pt-2 pb-10">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default MovementChart;
