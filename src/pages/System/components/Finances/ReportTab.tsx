import { useMemo, useState, type ReactNode } from "react";
import { Bar, Chart, Doughnut, Line } from "react-chartjs-2";
import {
    Chart as ChartJS, ArcElement, BarElement, BarController, CategoryScale, Filler, Legend, LinearScale, LineElement,
    LineController, PointElement, Tooltip, type ChartData, type TooltipItem,
} from "chart.js";
import { formatCents } from "./money";
import {
    cumulativeByDay, dailySpending, daysInMonth, largest, monthLabel, monthOf, monthTotals, monthlySeries,
    shiftMonth, spendingByEnvelope, type Month,
} from "./report";
import { GRID, INCOME, INK, INK_LIGHT, OTHER, RAMP, SPENDING, envelopeColors } from "./palette";
import { MonthPicker, Section } from "./ui";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import type { Envelope, FinanceData, Transaction } from "../../../../types/finances";

ChartJS.register(ArcElement, BarElement, BarController, LineController, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

type Props = { data: FinanceData; month: Month; onMonth: (m: Month) => void };

const dollars = (cents: number) => formatCents(cents);
const axisDollars = (v: number | string) => {
    const n = Number(v) / 100;
    return Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;
};
const percent = (r: number) => `${Math.round(r * 100)}%`;

// Recessive axes and a dark tooltip, the same chrome Body's chart wears.
const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: "bottom" as const, labels: { color: INK, font: { size: 12 }, boxWidth: 12 } },
        tooltip: { backgroundColor: "#48483D", titleColor: INK_LIGHT, bodyColor: INK_LIGHT, padding: 8 },
    },
};
const scale = (money = true) => ({
    grid: { color: GRID },
    ticks: { color: INK, font: { size: 12 }, ...(money && { callback: axisDollars }) },
});

// Bars with a line drawn over them (charts 2 and 4).
type MixedData = ChartData<"bar" | "line", (number | null)[], string>;

const ChartBox = ({ title, children, height = "h-64" }: { title: string; children: ReactNode; height?: string }) => (
    <Section title={title}>
        <div data-reveal-own className={`w-full ${height} px-3 pt-2 pb-3`}>{children}</div>
    </Section>
);

// The Report tab: nine charts, each answering one question (D10, R29–R38).
// Charts 1, 3, 4, 5, 6 and 9 show the chosen month; 2, 7 and 8 the twelve
// months that end with it. All the arithmetic lives in report.ts.
const ReportTab = ({ data, month, onMonth }: Props) => {
    const { transactions, envelopes } = data;
    const colors = useMemo(() => envelopeColors(envelopes), [envelopes]);
    const nameOf = (id: string) => envelopes.find(e => e._id === id)?.name ?? "?";

    return (
        <div className="flex flex-col gap-4">
            <Section title="Summary">
                <ToolbarRow>
                    <MonthPicker
                        label={monthLabel(month)}
                        onPrev={() => onMonth(shiftMonth(month, -1))}
                        onNext={() => onMonth(shiftMonth(month, 1))}
                        nextDisabled={month >= monthOf(data.today)}
                    />
                </ToolbarRow>
                <Tiles transactions={transactions} month={month} />
            </Section>

            <ChartBox title="Income vs spending · 12 months" height="h-72">
                <IncomeVsSpending transactions={transactions} month={month} />
            </ChartBox>

            <div className="grid gap-4 md:grid-cols-2">
                <ChartBox title="Where it went">
                    <SpendingShare transactions={transactions} month={month} envelopes={envelopes} colors={colors} nameOf={nameOf} />
                </ChartBox>
                <ChartBox title="Month pace">
                    <MonthPace transactions={transactions} month={month} today={data.today} />
                </ChartBox>
            </div>

            <SpendingVsTarget transactions={transactions} month={month} envelopes={envelopes} />

            <Section title="Spending by day">
                <SpendingCalendar transactions={transactions} month={month} />
            </Section>

            <ChartBox title="Envelope trend · 12 months" height="h-72">
                <EnvelopeTrend transactions={transactions} month={month} envelopes={envelopes} colors={colors} nameOf={nameOf} />
            </ChartBox>

            <div className="grid gap-4 md:grid-cols-2">
                <ChartBox title="Savings rate · 12 months">
                    <SavingsRate transactions={transactions} month={month} />
                </ChartBox>
                <LargestPurchases transactions={transactions} month={month} />
            </div>
        </div>
    );
};

// ── Chart 1: the month in four numbers ─────────────────────────────

const Tiles = ({ transactions, month }: { transactions: Transaction[]; month: Month }) => {
    const t = monthTotals(transactions, month);
    const tiles = [
        { label: "Income", value: dollars(t.income) },
        { label: "Spending", value: dollars(t.spending) },
        { label: "Net", value: dollars(t.net), negative: t.net < 0 },
        { label: "Savings rate", value: t.savingsRate == null ? "—" : percent(t.savingsRate), negative: (t.savingsRate ?? 0) < 0 },
    ];
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4">
            {tiles.map(tile => (
                <div key={tile.label} className="px-3 py-3 border-nier-150/40 border-r last:border-r-0 flex flex-col gap-1">
                    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">{tile.label}</span>
                    <span data-testid={`tile-${tile.label}`} className={`text-heading tabular-nums ${tile.negative ? "text-red-800" : "text-nier-text-dark"}`}>
                        {tile.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── Chart 2: income and spending side by side, net as a line ───────

const IncomeVsSpending = ({ transactions, month }: { transactions: Transaction[]; month: Month }) => {
    const series = monthlySeries(transactions, month);
    const data: MixedData = {
        labels: series.map(s => monthLabel(s.month, "short")),
        datasets: [
            { type: "bar", label: "Income", data: series.map(s => s.income), backgroundColor: INCOME, borderRadius: 4, borderColor: "#f0e9c5", borderWidth: 1 },
            { type: "bar", label: "Spending", data: series.map(s => s.spending), backgroundColor: SPENDING, borderRadius: 4, borderColor: "#f0e9c5", borderWidth: 1 },
            { type: "line", label: "Net", data: series.map(s => s.net), borderColor: INK, backgroundColor: INK, borderWidth: 2, pointRadius: 4, tension: 0.2 },
        ],
    };
    return (
        <Chart
            type="bar"
            data={data}
            options={{
                ...baseOptions,
                plugins: { ...baseOptions.plugins, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (c: TooltipItem<"bar" | "line">) => `${c.dataset.label}: ${dollars(c.parsed.y ?? 0)}` } } },
                scales: { x: scale(false), y: scale() },
            }}
        />
    );
};

// ── Chart 3: the month's spending, by Envelope ─────────────────────

type EnvelopeChartProps = {
    transactions: Transaction[];
    month: Month;
    envelopes: Envelope[];
    colors: Map<string, string | null>;
    nameOf: (id: string) => string;
};

/**
 * Envelopes in list order with their color, the ninth onward folded into one
 * "Other" series — a ninth hue would be a generated one nobody can tell apart.
 */
function foldedSeries(ids: string[], colors: Map<string, string | null>, nameOf: (id: string) => string) {
    const order = [...colors.keys()];
    const named = ids.filter(id => colors.get(id)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const other = ids.filter(id => !colors.get(id));
    return [
        ...named.map(id => ({ label: nameOf(id), color: colors.get(id)!, ids: [id] })),
        ...(other.length ? [{ label: "Other", color: OTHER, ids: other }] : []),
    ];
}

const SpendingShare = ({ transactions, month, colors, nameOf }: EnvelopeChartProps) => {
    const by = spendingByEnvelope(transactions, month);
    if (by.size === 0) return <Empty />;
    const groups = foldedSeries([...by.keys()], colors, nameOf);
    return (
        <Doughnut
            data={{
                labels: groups.map(g => g.label),
                datasets: [{
                    data: groups.map(g => g.ids.reduce((n, id) => n + (by.get(id) ?? 0), 0)),
                    backgroundColor: groups.map(g => g.color),
                    borderColor: "#f0e9c5",
                    borderWidth: 2,
                }],
            }}
            options={{
                ...baseOptions,
                cutout: "60%",
                plugins: {
                    ...baseOptions.plugins,
                    legend: { ...baseOptions.plugins.legend, position: "right" as const },
                    tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (c: TooltipItem<"doughnut">) => `${c.label}: ${dollars(c.parsed)}` } },
                },
            }}
        />
    );
};

// ── Chart 4: each Envelope's spending against its Target ───────────

const SpendingVsTarget = ({ transactions, month, envelopes }: Omit<EnvelopeChartProps, "colors" | "nameOf">) => {
    const by = spendingByEnvelope(transactions, month);
    const shown = envelopes
        .filter(e => (by.get(e._id) ?? 0) > 0 || (!e.archived && e.target))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const height = Math.max(10, shown.length * 2.25 + 4);
    return (
        <Section title="Spending vs Target">
            {shown.length === 0 ? <div className="h-40"><Empty /></div> : (
                <div data-reveal-own className="w-full px-3 pt-2 pb-3" style={{ height: `${height}rem` }}>
                    <Chart
                        type="bar"
                        data={{
                            labels: shown.map(e => e.name),
                            datasets: [
                                {
                                    type: "bar",
                                    label: "Spent",
                                    data: shown.map(e => by.get(e._id) ?? 0),
                                    backgroundColor: shown.map(e => ((by.get(e._id) ?? 0) > (e.target?.amount ?? Infinity) ? SPENDING : INCOME)),
                                    borderRadius: 4,
                                    barPercentage: 0.7,
                                },
                                {
                                    type: "line",
                                    label: "Target",
                                    data: shown.map(e => e.target?.amount ?? null),
                                    showLine: false,
                                    pointStyle: "line",
                                    pointRotation: 90,
                                    pointRadius: 12,
                                    pointHoverRadius: 12,
                                    borderWidth: 3,
                                    borderColor: INK,
                                    backgroundColor: INK,
                                },
                            ],
                        } satisfies MixedData}
                        options={{
                            ...baseOptions,
                            indexAxis: "y" as const,
                            plugins: {
                                ...baseOptions.plugins,
                                legend: { display: false },
                                tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (c: TooltipItem<"bar">) => `${c.dataset.label}: ${dollars(c.parsed.x ?? 0)}` } },
                            },
                            scales: { x: { ...scale(), beginAtZero: true }, y: scale(false) },
                        }}
                    />
                </div>
            )}
            <p className="text-label text-nier-text-dark/60 px-3 pb-3">
                The dark mark is the Target. A bar past its mark is drawn in the spending color.
            </p>
        </Section>
    );
};

// ── Chart 5: this month's running total against last month's ───────

const MonthPace = ({ transactions, month, today }: { transactions: Transaction[]; month: Month; today: string }) => {
    const prev = shiftMonth(month, -1);
    const current = cumulativeByDay(transactions, month);
    const before = cumulativeByDay(transactions, prev);
    const length = Math.max(current.length, before.length);
    // Days still to come this month stay off the line rather than flat-lining.
    const todayIndex = month === monthOf(today) ? Number(today.slice(8, 10)) : length;
    return (
        <Line
            data={{
                labels: Array.from({ length }, (_, i) => String(i + 1)),
                datasets: [
                    { label: monthLabel(month, "short"), data: current.map((v, i) => (i < todayIndex ? v : null)), borderColor: SPENDING, backgroundColor: SPENDING, borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: monthLabel(prev, "short"), data: before, borderColor: OTHER, backgroundColor: OTHER, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, tension: 0.1 },
                ],
            }}
            options={{
                ...baseOptions,
                interaction: { mode: "index" as const, intersect: false },
                plugins: { ...baseOptions.plugins, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { title: (c: TooltipItem<"line">[]) => `Day ${c[0].label}`, label: (c: TooltipItem<"bar" | "line">) => `${c.dataset.label}: ${dollars(c.parsed.y ?? 0)}` } } },
                scales: { x: { ...scale(false), ticks: { ...scale(false).ticks, maxTicksLimit: 8 } }, y: { ...scale(), beginAtZero: true } },
            }}
        />
    );
};

// ── Chart 6: the month as a calendar, darker for heavier days ───────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SpendingCalendar = ({ transactions, month }: { transactions: Transaction[]; month: Month }) => {
    const [hover, setHover] = useState<string | null>(null);
    const by = dailySpending(transactions, month);
    const max = Math.max(0, ...by.values());
    const [y, m] = month.split("-").map(Number);
    const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const cells: (string | null)[] = [
        ...Array(lead).fill(null),
        ...Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
    ];
    // Four steps above zero, by share of the month's heaviest day.
    const shade = (cents: number) => (cents === 0 ? RAMP[0] : RAMP[Math.min(4, Math.ceil((cents / max) * 4))]);

    return (
        <div className="p-3 flex flex-col gap-2">
            <div className="grid grid-cols-7 gap-1 max-w-md">
                {WEEKDAYS.map(d => <span key={d} className="text-eyebrow uppercase text-nier-text-dark/50 text-center">{d}</span>)}
                {cells.map((date, i) => date === null ? <span key={`pad-${i}`} /> : (
                    <button
                        key={date}
                        onMouseEnter={() => setHover(date)}
                        onFocus={() => setHover(date)}
                        onClick={() => setHover(date)}
                        aria-label={`${date}: ${dollars(by.get(date) ?? 0)}`}
                        className="aspect-square flex items-start justify-start p-1 cursor-default"
                        style={{ backgroundColor: shade(by.get(date) ?? 0) }}
                    >
                        <span className={`text-eyebrow ${(by.get(date) ?? 0) > max / 2 ? "text-nier-text-light" : "text-nier-text-dark/70"}`}>
                            {Number(date.slice(8))}
                        </span>
                    </button>
                ))}
            </div>
            <p className="text-label text-nier-text-dark/70 min-h-6">
                {hover ? `${hover}: ${dollars(by.get(hover) ?? 0)}` : by.size === 0 ? "No spending this month." : "Darker days cost more."}
            </p>
        </div>
    );
};

// ── Chart 7: each Envelope's spending across the year ──────────────

const EnvelopeTrend = ({ transactions, month, colors, nameOf }: EnvelopeChartProps) => {
    const months = monthlySeries(transactions, month).map(s => s.month);
    const perMonth = months.map(mo => spendingByEnvelope(transactions, mo));
    const ids = [...new Set(perMonth.flatMap(by => [...by.keys()]))];
    if (ids.length === 0) return <Empty />;
    const groups = foldedSeries(ids, colors, nameOf);
    return (
        <Line
            data={{
                labels: months.map(mo => monthLabel(mo, "short")),
                datasets: groups.map(g => ({
                    label: g.label,
                    data: perMonth.map(by => g.ids.reduce((n, id) => n + (by.get(id) ?? 0), 0)),
                    borderColor: "#f0e9c5",
                    backgroundColor: g.color,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.2,
                })),
            }}
            options={{
                ...baseOptions,
                interaction: { mode: "index" as const, intersect: false },
                plugins: { ...baseOptions.plugins, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (c: TooltipItem<"bar" | "line">) => `${c.dataset.label}: ${dollars(c.parsed.y ?? 0)}` } } },
                scales: { x: scale(false), y: { ...scale(), stacked: true, beginAtZero: true } },
            }}
        />
    );
};

// ── Chart 8: the share of income kept, month by month ──────────────

const SavingsRate = ({ transactions, month }: { transactions: Transaction[]; month: Month }) => {
    const series = monthlySeries(transactions, month);
    return (
        <Line
            data={{
                labels: series.map(s => monthLabel(s.month, "short")),
                datasets: [{
                    label: "Savings rate",
                    data: series.map(s => (s.savingsRate == null ? null : Math.round(s.savingsRate * 1000) / 10)),
                    borderColor: INCOME,
                    backgroundColor: INCOME,
                    borderWidth: 2,
                    pointRadius: 4,
                    tension: 0.2,
                    spanGaps: true,
                }],
            }}
            options={{
                ...baseOptions,
                plugins: { ...baseOptions.plugins, legend: { display: false }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (c: TooltipItem<"line">) => `${c.parsed.y}%` } } },
                scales: { x: scale(false), y: { ...scale(false), ticks: { ...scale(false).ticks, callback: (v: number | string) => `${v}%` } } },
            }}
        />
    );
};

// ── Chart 9: the month's largest purchases ─────────────────────────

const LargestPurchases = ({ transactions, month }: { transactions: Transaction[]; month: Month }) => {
    const top = largest(transactions, month, 10);
    const label = (t: Transaction) => t.payee || t.note || t.date;
    return (
        <ChartBox title="Largest purchases">
            {top.length === 0 ? <Empty /> : (
                <Bar
                    data={{
                        labels: top.map(label),
                        datasets: [{ label: "Spent", data: top.map(t => t.amount), backgroundColor: SPENDING, borderRadius: 4, barPercentage: 0.7 }],
                    }}
                    options={{
                        ...baseOptions,
                        indexAxis: "y" as const,
                        plugins: {
                            ...baseOptions.plugins,
                            legend: { display: false },
                            tooltip: { ...baseOptions.plugins.tooltip, callbacks: { title: (c: TooltipItem<"bar">[]) => `${top[c[0].dataIndex].date} · ${label(top[c[0].dataIndex])}`, label: (c: TooltipItem<"bar">) => dollars(c.parsed.x ?? 0) } },
                        },
                        scales: { x: { ...scale(), beginAtZero: true }, y: scale(false) },
                    }}
                />
            )}
        </ChartBox>
    );
};

const Empty = () => (
    <div className="h-full flex items-center justify-center">
        <span className="text-label text-nier-text-dark/40 uppercase tracking-widest">No spending yet</span>
    </div>
);

export default ReportTab;
