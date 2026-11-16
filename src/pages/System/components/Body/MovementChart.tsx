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
import { shortDate } from "./text";
import type { Point } from "../../../../types/body";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export const INK = "#48483D";
export const MUTED = "#8A8570";

/** The options every Body chart shares; `unit` follows each value on the axis and in the tooltip. */
export function chartOptions(unit: string) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: { color: "#3A3A31", font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: {
                backgroundColor: INK,
                titleColor: "#C4BEAC",
                bodyColor: "#C4BEAC",
                padding: 8,
                callbacks: {
                    label: (ctx: any) => (ctx.parsed.y !== null ? `${ctx.dataset.label}: ${ctx.parsed.y} ${unit}` : ""),
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
                ticks: { color: "#3A3A31", font: { size: 10 }, callback: (v: any) => `${v} ${unit}` },
            },
        },
    };
}

type Props = {
    /** One point for each Session, oldest first. */
    series: Point[];
    /** What a point is, for the legend and the tooltip. */
    label: string;
    /** Follows each value: "reps", "s", "lb". */
    unit: string;
};

// One line over the Sessions of a Movement (spec R28, panes R36). There is no
// target line. A Set that goes past failure has no rep target; the number to
// beat is the last point on this line.
const MovementChart = ({ series, label, unit }: Props) => {
    const data = {
        labels: series.map(p => shortDate(p.date)),
        datasets: [{
            label,
            data: series.map(p => p.value),
            borderColor: INK,
            backgroundColor: "rgba(72, 72, 61, 0.08)",
            pointBackgroundColor: INK,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
        }],
    };

    // data-reveal-own: a chart draws itself; a Cascade steps over it rather
    // than animating a canvas.
    return (
        <div data-reveal-own className="w-full h-56">
            <Line data={data} options={chartOptions(unit)} />
        </div>
    );
};

export default MovementChart;
