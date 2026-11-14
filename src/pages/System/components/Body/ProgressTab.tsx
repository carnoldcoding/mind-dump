import { useState } from "react";
import { Line } from "react-chartjs-2";
import { backend } from "../../../../api/backend";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import { useRetained } from "../../../../hooks/useRetained";
import { EditorModal, ErrorLine, Section, primaryBtn, secondaryBtn, smallBtn } from "../Finances/ui";
import { errorText } from "../Finances/errorText";
import { NumberField, Select } from "./fields";
import MovementChart, { INK, MUTED, chartOptions } from "./MovementChart";
import { rollingAverage } from "./progress";
import { fieldsFromSet, valuesFromFields } from "./session";
import type { SetFields } from "./session";
import { describeSet, formatLb, shortDate } from "./text";
import type { Ready } from "./TodayTab";
import type { GridWeek, LoggedSet, Movement, Session, WeighIn } from "../../../../types/body";

type Props = { data: Ready; onChanged: () => Promise<void> | void };

// The three measures (spec R26–R29): the weeks, the bodyweight, and each
// Movement's best over time.
const ProgressTab = ({ data, onChanged }: Props) => {
    const { summary, movements, sessions, weighins, today } = data;

    // Movements that have a Set come first: they are the ones with a chart.
    const charted = movements.filter(m => (summary.bests[m._id]?.series.length ?? 0) > 0);
    const [movementId, setMovementId] = useState("");
    const selected = movements.find(m => m._id === movementId) ?? charted[0] ?? movements[0] ?? null;

    const [editing, setEditing] = useState<{ session: Session; set: LoggedSet; movement: Movement } | null>(null);
    const [openCount, setOpenCount] = useState(0);
    const shown = useRetained(editing);

    const past = selected
        ? sessions
            .map(s => ({ session: s, sets: s.sets.filter(x => x.movementId === selected._id) }))
            .filter(x => x.sets.length > 0)
        : [];

    return (
        <div className="flex flex-col gap-4">
            <Section title="Weeks">
                <WeekGrid weeks={summary.grid} today={today} />
            </Section>

            <Section title="Bodyweight">
                <WeightChart weighins={weighins} target={summary.weight.targetLb} />
                <WeighInList weighins={weighins} onChanged={onChanged} />
            </Section>

            <Section title="Movements">
                {selected ? (
                    <>
                        <ToolbarRow>
                            <div className="w-full sm:w-80">
                                <Select
                                    label="Movement"
                                    value={selected._id}
                                    onChange={setMovementId}
                                    options={movements.map(m => ({ value: m._id, label: m.name }))}
                                />
                            </div>
                        </ToolbarRow>
                        <MovementChart series={summary.bests[selected._id]?.series ?? []} hold={selected.kind === "hold"} />
                        <div data-testid="past-sets" className="border-t border-nier-150/40 max-h-72 overflow-y-auto">
                            {past.length === 0 ? (
                                <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No sets yet.</p>
                            ) : past.map(({ session, sets }) => (
                                <div key={session._id} className="px-3 py-2 border-b border-nier-150/30 last:border-0 flex flex-col gap-1">
                                    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">{shortDate(session.date)}</span>
                                    {sets.map((set, n) => (
                                        <button
                                            key={set.id}
                                            onClick={() => { setOpenCount(c => c + 1); setEditing({ session, set, movement: selected }); }}
                                            className="text-left text-label text-nier-text-dark hover:bg-nier-150/30 cursor-pointer transition-colors py-1"
                                        >
                                            Set {n + 1}: {describeSet(selected, set)}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No movements yet.</p>
                )}
            </Section>

            {shown && (
                <SetModal
                    key={openCount}
                    open={editing !== null}
                    session={shown.session}
                    set={shown.set}
                    movement={shown.movement}
                    onClose={() => setEditing(null)}
                    onChanged={onChanged}
                />
            )}
        </div>
    );
};

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// One row for each week; each cell is done or not done (R26). There is no
// streak count: a missed day leaves an empty cell and nothing else changes.
const WeekGrid = ({ weeks, today }: { weeks: GridWeek[]; today: string }) => {
    const head = "px-2 py-2 font-normal text-eyebrow uppercase tracking-widest text-nier-text-dark/50";
    const cell = (done: boolean, future: boolean, label: string, testId: string) => (
        <td key={testId} className="px-2 py-2 text-center">
            <span
                role="img"
                aria-label={`${label}: ${done ? "done" : future ? "not yet" : "not done"}`}
                data-testid={testId}
                data-done={done}
                className={`inline-block w-4 h-4 border border-nier-dark ${done ? "bg-nier-text-dark" : future ? "opacity-25" : ""}`}
            />
        </td>
    );

    return (
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
                            {week.workouts.map(w => cell(w.done, !w.done && week.routine[w.weekday - 1]?.date > today,
                                `${w.name}, week of ${shortDate(week.weekStart)}`, `grid-${week.weekStart}-${w.key}`))}
                            {week.routine.map(d => cell(d.done, d.date > today, `Routine, ${shortDate(d.date)}`, `grid-${d.date}`))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Each Weigh-in as a point, the 7-day average as the line, the Phase target as
// a dashed line (R27). The points show the daily movement; the line is the
// trend.
const WeightChart = ({ weighins, target }: { weighins: WeighIn[]; target: number }) => {
    if (weighins.length === 0) {
        return <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No weigh-in yet.</p>;
    }
    const sorted = [...weighins].sort((a, b) => (a.date < b.date ? -1 : 1));
    const average = rollingAverage(sorted);
    const data = {
        labels: sorted.map(w => shortDate(w.date)),
        datasets: [
            {
                label: "Weigh-in",
                data: sorted.map(w => w.lb),
                showLine: false,
                pointBackgroundColor: MUTED,
                borderColor: MUTED,
                pointRadius: 3,
            },
            {
                label: "Average, 7 days",
                data: average.map(p => p.value),
                borderColor: INK,
                pointRadius: 0,
                borderWidth: 2,
                tension: 0.3,
            },
            {
                label: "Target",
                data: sorted.map(() => target),
                borderColor: MUTED,
                borderDash: [6, 4],
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0,
            },
        ],
    };
    return (
        <div data-reveal-own className="w-full h-56 px-4 pt-2 pb-3">
            <Line data={data} options={chartOptions("lb")} />
        </div>
    );
};

// Today's field writes only today's Weigh-in, so a wrong one from another
// day is removed here.
const WeighInList = ({ weighins, onChanged }: { weighins: WeighIn[]; onChanged: () => Promise<void> | void }) => {
    const [error, setError] = useState("");
    const recent = [...weighins].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 14);
    if (recent.length === 0) return null;

    const remove = async (date: string) => {
        setError("");
        try {
            await backend.removeBodyWeighIn(date);
            await onChanged();
        } catch (e) { setError(errorText(e)); }
    };

    return (
        <div className="border-t border-nier-150/40 max-h-48 overflow-y-auto">
            {recent.map(w => (
                <div key={w.date} data-testid={`weighin-${w.date}`} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-nier-150/30 last:border-0">
                    <span className="text-label text-nier-text-dark/70">{shortDate(w.date)}</span>
                    <span className="text-label text-nier-text-dark tabular-nums ml-auto">{formatLb(w.lb)}</span>
                    <button onClick={() => remove(w.date)} className={smallBtn}>Remove</button>
                </div>
            ))}
            {error && <div className="px-3 py-2"><ErrorLine error={error} /></div>}
        </div>
    );
};

/** Correct or delete a past Set (R29). The fields are the ones its Movement records. */
const SetModal = ({ open, session, set, movement, onClose, onChanged }: {
    open: boolean;
    session: Session;
    set: LoggedSet;
    movement: Movement;
    onClose: () => void;
    onChanged: () => Promise<void> | void;
}) => {
    const [fields, setFields] = useState<SetFields>(fieldsFromSet(set));
    const [error, setError] = useState("");
    const change = (key: keyof SetFields) => (v: string) => setFields(f => ({ ...f, [key]: v }));

    const run = async (action: () => Promise<unknown>) => {
        setError("");
        try {
            await action();
            await onChanged();
            onClose();
        } catch (e) { setError(errorText(e)); }
    };

    const save = () => {
        const { values, error: reason } = valuesFromFields(movement, fields);
        if (!values) { setError(reason ?? "Check the numbers"); return; }
        run(() => backend.updateBodySet(session._id, set.id, values));
    };

    return (
        <EditorModal open={open} title={`${movement.name}, ${shortDate(session.date)}`} onClose={onClose}>
            {movement.kind === "hold" ? (
                <NumberField label="Seconds" value={fields.seconds} onChange={change("seconds")} />
            ) : (
                <>
                    <NumberField label="Full" value={fields.full} onChange={change("full")} />
                    {movement.rule === "pastFailure" && (
                        <>
                            <NumberField label="Partial" value={fields.partial} onChange={change("partial")} />
                            <NumberField label="Assisted" value={fields.assisted} onChange={change("assisted")} />
                        </>
                    )}
                </>
            )}
            {movement.loaded && <NumberField label="Load lb" value={fields.load} onChange={change("load")} decimal />}
            <div className="flex gap-2">
                <button onClick={save} className={primaryBtn}>Save</button>
                <button onClick={() => run(() => backend.removeBodySet(session._id, set.id))} className={secondaryBtn}>Delete set</button>
            </div>
            <ErrorLine error={error} />
        </EditorModal>
    );
};

export default ProgressTab;
