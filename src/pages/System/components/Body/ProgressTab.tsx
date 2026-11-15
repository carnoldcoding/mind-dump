import { useState } from "react";
import type { FormEvent } from "react";
import { Line } from "react-chartjs-2";
import { backend } from "../../../../api/backend";
import { errorText } from "../Finances/errorText";
import { NumberField } from "./fields";
import { Frame, ListRow, PaneTitle, Stat, Stats, Stepper } from "./frame";
import { BOUND, EYEBROW } from "./frameStyle";
import { GLYPH, RULE_GLYPH, TREND_GLYPH } from "./glyphs";
import { Chip, GlyphButton } from "./marks";
import MovementChart, { INK, MUTED, chartOptions } from "./MovementChart";
import { OVERVIEW, WEEKS, WEIGHT, inRange, progressHint, progressOrder, rollingAverage } from "./progress";
import type { Range } from "./progress";
import { fieldsFromSet, valuesFromFields } from "./session";
import type { SetFields } from "./session";
import { RULE_LABEL, describeSet, formatLb, longDate, shortDate, signedLb, valueText } from "./text";
import type { Ready } from "./TodayTab";
import type { BodySummary, GridWeek, LoggedSet, Movement, MovementStats, Point, Session, SetValues, WeighIn } from "../../../../types/body";

type Props = { data: Ready; onChanged: () => Promise<void> | void };

const DASH = "—";
const count = (c: { done: number; planned: number }) => `${c.done} / ${c.planned}`;
const lb = (n: number | null) => (n == null ? DASH : n.toFixed(1));

// Progress is the analytics page (body-panes R16–R38), in the structure of
// Today: a list of what can be looked at — the Phase as a whole, the weeks,
// the bodyweight, then each Movement — and a pane that shows the selected one.
// Every number is the server's (ADR-0013); this view only lays them out.
const ProgressTab = ({ data, onChanged }: Props) => {
    const { summary, plan, movements, sessions, weighins, today } = data;
    const [selected, setSelected] = useState<string>(OVERVIEW);
    const [error, setError] = useState("");

    const order = progressOrder(plan, movements, summary.bests);
    const movement = order.find(m => m._id === selected);
    const week = summary.grid[0];

    const select = (id: string) => { setError(""); setSelected(id); };

    // Every write goes through here: it reloads, and a refusal shows in the hint bar.
    const act = async (run: () => Promise<unknown>) => {
        setError("");
        try {
            await run();
            await onChanged();
            return true;
        } catch (e) {
            setError(errorText(e));
            return false;
        }
    };

    return (
        <Frame
            id="progress"
            label="Progress"
            title="Progress"
            aside={plan.phase.name}
            selected={selected}
            paneKey={selected}
            hint={progressHint(selected, movement)}
            error={error}
            wide
            list={
                <>
                    <ListRow id={OVERVIEW} name="Overview" glyph="" selected={selected === OVERVIEW} onSelect={select} />
                    <ListRow
                        id={WEEKS}
                        name="Weeks"
                        glyph=""
                        value={week ? `${week.workouts.filter(w => w.done).length} / ${week.workouts.length}` : DASH}
                        valueLabel="Workouts done this week"
                        selected={selected === WEEKS}
                        onSelect={select}
                    />
                    <ListRow
                        id={WEIGHT}
                        name="Weight"
                        glyph=""
                        value={summary.weight.average != null ? formatLb(summary.weight.average) : DASH}
                        selected={selected === WEIGHT}
                        onSelect={select}
                    />
                    {order.map(m => {
                        const stats = summary.bests[m._id];
                        const last = stats?.series[stats.series.length - 1];
                        const record = Boolean(last && stats.records.includes(last.date));
                        return (
                            <ListRow
                                key={m._id}
                                id={m._id}
                                testId={`movement-${m.name}`}
                                name={m.name}
                                glyph={record ? GLYPH.done : GLYPH.open}
                                value={stats?.best ? valueText(m, stats.best.value) : DASH}
                                mid={stats?.trend && (
                                    <span data-testid="trend" aria-label={`Trend: ${stats.trend}`} className="text-label shrink-0 order-last w-4 text-center">
                                        {TREND_GLYPH[stats.trend]}
                                    </span>
                                )}
                                selected={selected === m._id}
                                onSelect={select}
                            />
                        );
                    })}
                </>
            }
            pane={
                <>
                    {selected === OVERVIEW && <OverviewPane summary={summary} movements={movements} onSelect={select} />}
                    {selected === WEEKS && <WeeksPane summary={summary} today={today} />}
                    {selected === WEIGHT && (
                        <WeightPane weight={summary.weight} weighins={weighins} today={today} onRemove={date => act(() => backend.removeBodyWeighIn(date))} />
                    )}
                    {movement && (
                        <MovementPane
                            movement={movement}
                            stats={summary.bests[movement._id]}
                            sessions={sessions}
                            onSave={(session, set, values) => act(() => backend.updateBodySet(session._id, set.id, values))}
                            onRemove={(session, set) => act(() => backend.removeBodySet(session._id, set.id))}
                            onError={setError}
                        />
                    )}
                </>
            }
        />
    );
};

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** One cell of a week: done, not done, or not yet. */
const Cell = ({ done, future, label, testId }: { done: boolean; future: boolean; label: string; testId: string }) => (
    <span
        role="img"
        aria-label={`${label}: ${done ? "done" : future ? "not yet" : "not done"}`}
        data-testid={testId}
        data-done={done}
        className={`text-body leading-none text-nier-text-dark ${!done && future ? "opacity-25" : ""}`}
    >
        {done ? GLYPH.done : GLYPH.open}
    </span>
);

// Where the Phase is now, on one screen: this week, done against planned, the
// bodyweight, the totals, and the last records. Counts, never a streak: a
// missed day lowers one number by one and erases nothing (body-panes D4).
const OverviewPane = ({ summary, movements, onSelect }: {
    summary: BodySummary;
    movements: Movement[];
    onSelect: (id: string) => void;
}) => {
    const { weight, adherence, totals, records } = summary;
    const week = summary.grid[0];
    const today = summary.today.date;
    const byId = new Map(movements.map(m => [m._id, m]));

    return (
        <>
            <PaneTitle name="Overview" at={week ? `Week of ${shortDate(week.weekStart)}` : undefined} />
            {week && (
                <div data-testid="this-week" className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    <div className="flex gap-4">
                        {week.workouts.map(w => (
                            <div key={w.key} className="flex flex-col items-center gap-1">
                                <span className={EYEBROW}>{w.name}</span>
                                <Cell done={w.done} future={!w.done && week.routine[w.weekday - 1]?.date > today} label={w.name} testId={`week-${w.key}`} />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        {week.routine.map((d, i) => (
                            <div key={d.date} className="flex flex-col items-center gap-1">
                                <span className={EYEBROW}>{DAY_LETTERS[i]}</span>
                                <Cell done={d.done} future={d.date > today} label={`Stretches, ${shortDate(d.date)}`} testId={`week-${d.date}`} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <Stats>
                <Stat label="Workouts, 4 weeks" value={count(adherence.workouts)} testId="stat-workouts" />
                <Stat label="Stretches, 28 days" value={`${adherence.stretches.done} / ${adherence.stretches.days}`} testId="stat-stretches" />
                <Stat label="Weight, avg 7d" value={lb(weight.average)} sub={weight.change != null ? signedLb(weight.change) : undefined} testId="stat-weight" />
                <Stat label="Pace, a week" value={weight.pace != null ? signedLb(weight.pace) : DASH} testId="stat-pace" />
                <Stat label="Sessions" value={String(totals.sessions)} testId="stat-sessions" />
                <Stat label="Sets" value={String(totals.sets)} testId="stat-sets" />
            </Stats>
            <div data-testid="records" className={BOUND}>
                <span className={EYEBROW}>Records</span>
                {records.length === 0 ? (
                    <p className="text-label text-nier-text-dark/50">{DASH}</p>
                ) : (
                    <div className="border-t border-nier-150/40">
                        {records.map(r => {
                            const m = byId.get(r.movementId);
                            if (!m) return null;
                            return (
                                <button
                                    key={`${r.movementId}:${r.date}`}
                                    type="button"
                                    onClick={() => onSelect(m._id)}
                                    className="w-full flex items-baseline gap-3 px-1 min-h-11 border-b border-nier-150/30 text-left text-label text-nier-text-dark hover:bg-nier-150/40 cursor-pointer transition-colors"
                                >
                                    <span className={`${EYEBROW} w-14 shrink-0`}>{shortDate(r.date)}</span>
                                    <span className="flex-1 min-w-0 truncate">{m.name}</span>
                                    <span className="tabular-nums shrink-0">{valueText(m, r.value)}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

// One row for each week; each cell is done or not done (body-plan R26). There
// is no streak count: a missed day leaves an empty cell and nothing else
// changes. Under it, each Workout over all weeks.
const WeeksPane = ({ summary, today }: { summary: BodySummary; today: string }) => {
    const weeks: GridWeek[] = summary.grid;
    const head = "px-2 py-2 font-normal text-eyebrow uppercase tracking-widest text-nier-text-dark/50";
    return (
        <>
            <PaneTitle name="Weeks" at={String(weeks.length)} />
            <Stats>
                {weeks[0]?.workouts.map(w => (
                    <Stat key={w.key} label={w.name} value={count(summary.adherence.byWorkout[w.key] ?? { done: 0, planned: 0 })} testId={`weeks-${w.key}`} />
                ))}
            </Stats>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className={head}>Week of</th>
                            {weeks[0]?.workouts.map(w => <th key={w.key} className={`${head} text-center`}>{w.name}</th>)}
                            {DAY_LETTERS.map((d, i) => <th key={i} className={`${head} text-center`}>{d}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map(week => (
                            <tr key={week.weekStart} className="border-t border-nier-150/30">
                                <td className="px-2 py-2 text-label text-nier-text-dark whitespace-nowrap">{shortDate(week.weekStart)}</td>
                                {week.workouts.map(w => (
                                    <td key={w.key} className="px-2 py-2 text-center">
                                        <Cell
                                            done={w.done}
                                            future={!w.done && week.routine[w.weekday - 1]?.date > today}
                                            label={`${w.name}, week of ${shortDate(week.weekStart)}`}
                                            testId={`grid-${week.weekStart}-${w.key}`}
                                        />
                                    </td>
                                ))}
                                {week.routine.map(d => (
                                    <td key={d.date} className="px-2 py-2 text-center">
                                        <Cell done={d.done} future={d.date > today} label={`Stretches, ${shortDate(d.date)}`} testId={`grid-${d.date}`} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

const RANGES: { id: Range; label: string }[] = [{ id: "4w", label: "4W" }, { id: "12w", label: "12W" }, { id: "all", label: "All" }];

// The bodyweight against the Phase. The trend is read off the 7-day average
// and the pace, not the latest value (body-plan R18): one day's value moves
// with water and food.
const WeightPane = ({ weight, weighins, today, onRemove }: {
    weight: BodySummary["weight"];
    weighins: WeighIn[];
    today: string;
    onRemove: (date: string) => void;
}) => {
    const [range, setRange] = useState<Range>("12w");
    const shown = inRange(weighins, today, range);
    const newest = [...shown].sort((a, b) => (a.date < b.date ? 1 : -1));

    return (
        <>
            <PaneTitle name="Weight" at="lb" />
            <Stats>
                <Stat label="Avg 7d" value={lb(weight.average)} testId="weight-average" />
                <Stat label="Start" value={weight.startLb.toFixed(1)} testId="weight-start" />
                <Stat label="Target" value={weight.targetLb.toFixed(1)} testId="weight-target" />
                <Stat label="Change" value={weight.change != null ? signedLb(weight.change) : DASH} testId="weight-change" />
                <Stat label="To go" value={weight.toGo != null ? formatLb(weight.toGo) : DASH} testId="weight-togo" />
                <Stat label="Pace, a week" value={weight.pace != null ? signedLb(weight.pace) : DASH} testId="weight-pace" />
                <Stat label="Lowest" value={weight.lowest ? weight.lowest.lb.toFixed(1) : DASH} sub={weight.lowest ? shortDate(weight.lowest.date) : undefined} testId="weight-lowest" />
                <Stat label="Target on" value={weight.eta ? longDate(weight.eta) : DASH} testId="weight-eta" />
            </Stats>
            <div className="flex gap-1">
                {RANGES.map(r => <Chip key={r.id} testId={`range-${r.id}`} active={range === r.id} onClick={() => setRange(r.id)}>{r.label}</Chip>)}
            </div>
            <WeightChart weighins={shown} target={weight.targetLb} />
            {/* Today's field writes only today's Weigh-in, so a wrong one from another day is removed here. */}
            <div data-testid="weighins" className={`${BOUND} gap-0 border-t border-nier-150/40`}>
                {newest.map(w => (
                    <div key={w.date} data-testid={`weighin-${w.date}`} className="flex items-center justify-between gap-3 pl-1 border-b border-nier-150/30">
                        <span className="text-label text-nier-text-dark/70">{shortDate(w.date)}</span>
                        <span className="text-label text-nier-text-dark tabular-nums ml-auto">{formatLb(w.lb)}</span>
                        <GlyphButton glyph={GLYPH.remove} label={`Remove the weigh-in of ${shortDate(w.date)}`} onClick={() => onRemove(w.date)} bare />
                    </div>
                ))}
            </div>
        </>
    );
};

// Each Weigh-in as a point, the 7-day average as the line, the Phase target as
// a dashed line (body-plan R27). The points show the daily movement; the line
// is the trend.
const WeightChart = ({ weighins, target }: { weighins: WeighIn[]; target: number }) => {
    if (weighins.length === 0) return <p data-testid="no-chart" className="text-label text-nier-text-dark/50">{DASH}</p>;
    const sorted = [...weighins].sort((a, b) => (a.date < b.date ? -1 : 1));
    const average = rollingAverage(sorted);
    const data = {
        labels: sorted.map(w => shortDate(w.date)),
        datasets: [
            { label: "Weigh-in", data: sorted.map(w => w.lb), showLine: false, pointBackgroundColor: MUTED, borderColor: MUTED, pointRadius: 3 },
            { label: "Average, 7 days", data: average.map(p => p.value), borderColor: INK, pointRadius: 0, borderWidth: 2, tension: 0.3 },
            { label: "Target", data: sorted.map(() => target), borderColor: MUTED, borderDash: [6, 4], borderWidth: 2, pointRadius: 0, pointHoverRadius: 0 },
        ],
    };
    return (
        <div data-reveal-own className="w-full h-56">
            <Line data={data} options={chartOptions("lb")} />
        </div>
    );
};

type Measure = "best" | "first" | "total" | "load";

// One Movement over time. One chart, and a control that says what it draws
// (body-panes D6): the best Set of each Session, its first Set — the one that
// is not tired — or the sum of its Sets. Under it, each Session, where a
// wrong Set is corrected.
const MovementPane = ({ movement, stats, sessions, onSave, onRemove, onError }: {
    movement: Movement;
    stats: MovementStats | undefined;
    sessions: Session[];
    onSave: (session: Session, set: LoggedSet, values: SetValues) => Promise<boolean>;
    onRemove: (session: Session, set: LoggedSet) => Promise<boolean>;
    onError: (reason: string) => void;
}) => {
    const [measure, setMeasure] = useState<Measure>("best");
    const [editing, setEditing] = useState<string | null>(null);
    const hold = movement.kind === "hold";
    const unit = hold ? "s" : "reps";
    const text = (n: number) => valueText(movement, n);

    const measures: { id: Measure; label: string; series: Point[]; name: string; unit: string }[] = [
        { id: "best", label: "Best", series: stats?.series ?? [], name: hold ? "Longest hold" : "Best full reps", unit },
        { id: "first", label: "First set", series: stats?.first ?? [], name: "First set", unit },
        { id: "total", label: "Total", series: stats?.total ?? [], name: hold ? "Seconds of the Session" : "Reps of the Session", unit },
        ...(movement.loaded ? [{ id: "load" as Measure, label: "Load", series: stats?.load ?? [], name: "Highest load", unit: "lb" }] : []),
    ];
    const shown = measures.find(m => m.id === measure) ?? measures[0];

    const past = sessions
        .map(session => ({ session, sets: session.sets.filter(x => x.movementId === movement._id) }))
        .filter(x => x.sets.length > 0)
        .sort((a, b) => (a.session.date < b.session.date ? 1 : -1));
    const series = stats?.series ?? [];
    const last = past[0];

    return (
        <>
            <PaneTitle name={movement.name} at={`${movement.sets} × ${RULE_GLYPH[movement.rule]}`} />
            <p className="sr-only">{RULE_LABEL[movement.rule]}</p>
            <Stats>
                <Stat label="Best" value={stats?.best ? text(stats.best.value) : DASH} sub={stats?.best ? shortDate(stats.best.date) : undefined} testId="stat-best" />
                <Stat label="Last" value={last ? last.sets.map(s => describeSet(movement, s)).join(" / ") : DASH} sub={last ? shortDate(last.session.date) : undefined} testId="stat-last" />
                <Stat label="First → last" value={series.length > 0 ? `${text(series[0].value)} → ${text(series[series.length - 1].value)}` : DASH} testId="stat-span" />
                <Stat label="Sessions" value={String(stats?.sessions ?? 0)} testId="stat-sessions" />
                <Stat label="Sets" value={String(stats?.sets ?? 0)} testId="stat-sets" />
                <Stat label="Total" value={stats && stats.sets > 0 ? text(stats.sum) : DASH} testId="stat-total" />
            </Stats>
            <div className="flex gap-1">
                {measures.map(m => <Chip key={m.id} testId={`measure-${m.id}`} active={shown.id === m.id} onClick={() => setMeasure(m.id)}>{m.label}</Chip>)}
            </div>
            {shown.series.length === 0
                ? <p data-testid="no-chart" className="text-label text-nier-text-dark/50">{DASH}</p>
                : <div data-testid={`chart-${shown.id}`}><MovementChart series={shown.series} label={shown.name} unit={shown.unit} /></div>}
            <div data-testid="past-sets" className={`${BOUND} gap-0 border-t border-nier-150/40`}>
                {past.map(({ session, sets }) => {
                    const record = Boolean(stats?.records.includes(session.date));
                    return (
                        <div key={session._id} data-testid={`session-${session.date}`} data-record={record} className="border-b border-nier-150/30 py-1 flex flex-col">
                            <div className="flex items-center gap-3 min-h-11">
                                <span className={`${EYEBROW} w-14 shrink-0`}>{shortDate(session.date)}</span>
                                <span aria-label={record ? "Record" : undefined} className="w-4 shrink-0 text-center text-label text-nier-text-dark">{record ? GLYPH.done : ""}</span>
                                <div className="flex flex-wrap gap-1">
                                    {sets.map((set, n) => (
                                        <button
                                            key={set.id}
                                            type="button"
                                            aria-label={`Set ${n + 1}: ${describeSet(movement, set)}`}
                                            aria-pressed={editing === set.id}
                                            onClick={() => { onError(""); setEditing(editing === set.id ? null : set.id); }}
                                            className={`min-w-11 min-h-11 px-2 text-label tabular-nums cursor-pointer transition-colors ${
                                                editing === set.id ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark hover:bg-nier-150/40"
                                            }`}
                                        >
                                            {describeSet(movement, set)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {sets.filter(set => set.id === editing).map(set => (
                                <SetEditor
                                    key={set.id}
                                    movement={movement}
                                    set={set}
                                    onSave={async values => { if (await onSave(session, set, values)) setEditing(null); }}
                                    onRemove={async () => { if (await onRemove(session, set)) setEditing(null); }}
                                    onError={onError}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </>
    );
};

/** Correct or delete a past Set, on its own line (body-plan R29, body-panes R38). */
const SetEditor = ({ movement, set, onSave, onRemove, onError }: {
    movement: Movement;
    set: LoggedSet;
    onSave: (values: SetValues) => void;
    onRemove: () => void;
    onError: (reason: string) => void;
}) => {
    const hold = movement.kind === "hold";
    const key = hold ? "seconds" : "full";
    const [fields, setFields] = useState<SetFields>(fieldsFromSet(set));
    const change = (k: keyof SetFields) => (v: string) => setFields(f => ({ ...f, [k]: v }));

    const save = (e: FormEvent) => {
        e.preventDefault();
        const { values, error: reason } = valuesFromFields(movement, fields);
        if (!values) { onError(reason ?? "Check the numbers"); return; }
        onSave(values);
    };

    return (
        <form onSubmit={save} data-testid="set-editor" className="flex flex-wrap items-center gap-2 md:gap-3 py-2">
            <Stepper
                label={hold ? "Seconds" : "Reps"}
                value={fields[key]}
                onChange={change(key)}
                size={hold ? 5 : 1}
                less={hold ? "5 seconds less" : "One rep less"}
                more={hold ? "5 seconds more" : "One rep more"}
            />
            {movement.loaded && <div className="w-28"><NumberField label="Load lb" value={fields.load} onChange={change("load")} decimal /></div>}
            <GlyphButton glyph={GLYPH.save} label="Save set" type="submit" solid disabled={fields[key].trim() === ""} />
            <GlyphButton glyph={GLYPH.remove} label="Delete set" onClick={onRemove} className="ml-auto" />
        </form>
    );
};

export default ProgressTab;
