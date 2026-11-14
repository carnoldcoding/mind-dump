import { useState } from "react";
import { backend } from "../../../../api/backend";
import { ErrorLine, Section, primaryBtn, smallBtn } from "../Finances/ui";
import { errorText } from "../Finances/errorText";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { NumberField } from "./fields";
import SessionCard from "./SessionCard";
import { sessionRows } from "./session";
import { describeRoutineItem, formatLb, heading, signedLb } from "./text";
import type { BodyData, BodySummary, Plan, WorkoutKey } from "../../../../types/body";

export type Ready = BodyData & { plan: Plan; summary: BodySummary };

type Props = { data: Ready; onChanged: () => Promise<void> | void };

// What is due today (spec R12–R18): the heading names the day's Workout, and
// under it sit the three things there are to do — the Routine, the Session
// and the Weigh-in.
const TodayTab = ({ data, onChanged }: Props) => {
    const { plan, summary, today, movements, sessions } = data;
    const t = summary.today;
    const due = plan.workouts.find(w => w.key === t.due) ?? null;
    const todays = sessions.filter(s => s.date === today);

    // The Workout on screen: the one the user started by hand, else the one
    // due, else one already begun today.
    const [picked, setPicked] = useState<WorkoutKey | null>(null);
    const shownKey = picked ?? due?.key ?? todays[0]?.workoutKey ?? null;
    const shown = plan.workouts.find(w => w.key === shownKey) ?? null;
    const shownSession = todays.find(s => s.workoutKey === shownKey) ?? null;

    // Every other Workout that can be opened today: the missed ones of this
    // week (R15), and any Session already begun today.
    const others = plan.workouts.filter(w =>
        w.key !== shownKey && (t.missed.includes(w.key) || todays.some(s => s.workoutKey === w.key)));

    const routineDone = data.checks.some(c => c.date === today);
    const shownRows = shown ? sessionRows(shown, movements, shownSession) : [];
    const logged = shownRows.filter(r => r.sets.length > 0).length;

    return (
        <div className="flex flex-col gap-4">
            <ShadowBox as="section" label="Today" className="bg-nier-100-lighter border border-nier-150 px-3 py-3 flex flex-col gap-2">
                <h2 data-testid="today-heading" className="text-title tracking-wide text-nier-text-dark">
                    {heading(t.weekday, due?.name ?? null)}
                </h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label text-nier-text-dark/80">
                    <dt className="uppercase tracking-widest text-nier-text-dark/50">Morning routine</dt>
                    <dd data-testid="summary-routine">{routineDone ? "done" : "not done"}</dd>
                    <dt className="uppercase tracking-widest text-nier-text-dark/50">Training</dt>
                    <dd data-testid="summary-training">
                        {shown ? `${shownRows.length} movements, ${logged} logged` : "rest day"}
                    </dd>
                    <dt className="uppercase tracking-widest text-nier-text-dark/50">Bodyweight</dt>
                    <dd data-testid="summary-weight">
                        {summary.weight.latest
                            ? `${formatLb(summary.weight.latest.lb)}${summary.weight.change != null ? ` (${signedLb(summary.weight.change)} from start)` : ""}`
                            : "no weigh-in yet"}
                    </dd>
                </dl>
            </ShadowBox>

            <RoutineSection plan={plan} date={today} done={routineDone} onChanged={onChanged} />

            {shown ? (
                <SessionCard
                    key={shown.key}
                    workout={shown}
                    movements={movements}
                    session={shownSession}
                    previous={summary.previous}
                    date={today}
                    onChanged={onChanged}
                />
            ) : (
                <Section title="Training">
                    <p className="text-label text-nier-text-dark/50 uppercase tracking-widest px-3 py-3">Rest day. No Workout is planned.</p>
                </Section>
            )}

            {others.length > 0 && (
                <Section title="Other workouts this week">
                    {others.map(w => {
                        const begun = todays.some(s => s.workoutKey === w.key);
                        return (
                            <div key={w.key} data-testid={`other-${w.key}`} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-nier-150/30 last:border-0">
                                <span className="text-label text-nier-text-dark">
                                    {w.name}
                                    <span className="text-nier-text-dark/50"> — {begun ? "begun today" : "missed"}</span>
                                </span>
                                <button onClick={() => setPicked(w.key)} className={smallBtn}>{begun ? "Open" : "Start"}</button>
                            </div>
                        );
                    })}
                </Section>
            )}

            <WeighInSection weight={summary.weight} date={today} today={data.weighins.find(w => w.date === today)?.lb ?? null} onChanged={onChanged} />
        </div>
    );
};

// The Routine is one check for the date (R14): the list is what to do, and the
// button says that it was done. Nothing about a single stretch is recorded.
const RoutineSection = ({ plan, date, done, onChanged }: {
    plan: Plan;
    date: string;
    done: boolean;
    onChanged: () => Promise<void> | void;
}) => {
    const [error, setError] = useState("");
    const toggle = async () => {
        setError("");
        try {
            await backend.checkBodyRoutine(date, !done);
            await onChanged();
        } catch (e) { setError(errorText(e)); }
    };

    return (
        <Section title="Morning routine">
            <ul>
                {plan.routine.items.map((item, i) => (
                    <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-nier-150/30">
                        <span className={`text-label ${done ? "text-nier-text-dark/50" : "text-nier-text-dark"}`}>{item.name}</span>
                        <span className="text-label text-nier-text-dark/60 shrink-0">{describeRoutineItem(item)}</span>
                    </li>
                ))}
            </ul>
            <div className="px-3 py-3 flex flex-col gap-2">
                <div>
                    <button onClick={toggle} aria-pressed={done} className={done ? smallBtn : primaryBtn}>
                        {done ? "Done — undo" : "Mark routine done"}
                    </button>
                </div>
                <ErrorLine error={error} />
            </div>
        </Section>
    );
};

// One Weigh-in for the date; saving again replaces it (R17). Progress is read
// off the 7-day average, not the latest value (R18).
const WeighInSection = ({ weight, date, today, onChanged }: {
    weight: BodySummary["weight"];
    date: string;
    today: number | null;
    onChanged: () => Promise<void> | void;
}) => {
    const [text, setText] = useState(today != null ? String(today) : "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        const lb = Number(text.trim());
        if (text.trim() === "" || !Number.isFinite(lb) || lb <= 0) { setError("Enter your weight in pounds"); return; }
        setError("");
        setSaving(true);
        try {
            await backend.setBodyWeighIn(date, lb);
            await onChanged();
        } catch (e) { setError(errorText(e)); } finally { setSaving(false); }
    };

    const line = "flex items-baseline justify-between gap-3";
    const term = "text-eyebrow uppercase tracking-widest text-nier-text-dark/50";

    return (
        <Section title="Bodyweight">
            <div className="px-3 py-3 flex flex-col gap-3">
                <div className="flex items-end gap-3">
                    <div className="w-40 min-w-0"><NumberField label="Today lb" value={text} onChange={setText} decimal /></div>
                    <button onClick={save} disabled={saving} className={primaryBtn}>{saving ? "…" : "Save"}</button>
                </div>
                <ErrorLine error={error} />
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-label text-nier-text-dark">
                    <div className={line}>
                        <dt className={term}>Latest</dt>
                        <dd data-testid="weight-latest">{weight.latest ? formatLb(weight.latest.lb) : "—"}</dd>
                    </div>
                    <div className={line}>
                        <dt className={term}>Average, 7 days</dt>
                        <dd data-testid="weight-average">
                            {weight.average != null ? `${formatLb(weight.average)} (${weight.count} weigh-in${weight.count === 1 ? "" : "s"})` : "—"}
                        </dd>
                    </div>
                    <div className={line}>
                        <dt className={term}>Start</dt>
                        <dd data-testid="weight-start">{formatLb(weight.startLb)}</dd>
                    </div>
                    <div className={line}>
                        <dt className={term}>Target</dt>
                        <dd data-testid="weight-target">{formatLb(weight.targetLb)}</dd>
                    </div>
                    <div className={line}>
                        <dt className={term}>Change from start</dt>
                        <dd data-testid="weight-change">{weight.change != null ? signedLb(weight.change) : "—"}</dd>
                    </div>
                </dl>
            </div>
        </Section>
    );
};

export default TodayTab;
