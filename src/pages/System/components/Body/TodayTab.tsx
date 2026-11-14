import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { backend } from "../../../../api/backend";
import { ErrorLine, Section } from "../Finances/ui";
import { errorText } from "../Finances/errorText";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import SessionCard from "./SessionCard";
import { GLYPH, stateGlyph } from "./glyphs";
import { Chip, GlyphButton } from "./marks";
import { sessionRows } from "./session";
import { describeRoutineItem, formatLb, heading, signedLb } from "./text";
import type { BodyData, BodySummary, Plan, WorkoutKey } from "../../../../types/body";

export type Ready = BodyData & { plan: Plan; summary: BodySummary };

type Props = { data: Ready; onChanged: () => Promise<void> | void };

// One line of the status bar: a state glyph, a name, and what there is to say.
const ROW = "flex items-center gap-3 min-h-11";
const MARK = "w-6 shrink-0 text-center text-body leading-none";
const NAME = "w-24 shrink-0 text-left text-label uppercase tracking-widest text-nier-text-dark";

// What is due today (body-plan R12–R18, body-ui R4–R17). The status bar is
// both the report and the control: the Routine is checked on its own row and
// the Weigh-in is entered on its own row, so nothing is shown twice. Under it
// is the Session.
const TodayTab = ({ data, onChanged }: Props) => {
    const { plan, summary, today, movements, sessions } = data;
    const t = summary.today;
    const due = plan.workouts.find(w => w.key === t.due) ?? null;
    const todays = sessions.filter(s => s.date === today);
    const [error, setError] = useState("");

    // The Workout on screen: the one the user picked, else the one due, else
    // one already begun today.
    const [picked, setPicked] = useState<WorkoutKey | null>(null);
    const shownKey = picked ?? due?.key ?? todays[0]?.workoutKey ?? null;
    const shown = plan.workouts.find(w => w.key === shownKey) ?? null;
    const shownSession = todays.find(s => s.workoutKey === shownKey) ?? null;

    // Every Workout that can be opened today: the one due, the missed ones of
    // this week (body-plan R15), and any Session already begun today.
    const openable = plan.workouts.filter(w =>
        w.key === due?.key || t.missed.includes(w.key) || todays.some(s => s.workoutKey === w.key));

    const shownRows = shown ? sessionRows(shown, movements, shownSession) : [];
    const finished = shownRows.filter(r => r.done).length;
    const touched = shownRows.filter(r => r.done || r.sets.length > 0).length;

    // The chips are a view control: they change which Workout is on screen.
    // They show only when there is a Workout to open besides the one due
    // (R11), and stay once one is picked, so the choice stays visible.
    const thisWeek = summary.grid.find(week => week.routine.some(d => d.date === today));
    const chips: ReactNode = openable.some(w => w.key !== due?.key) && (
        <ToolbarRow>
            {openable.map(w => (
                <Chip key={w.key} testId={`other-${w.key}`} active={w.key === shownKey} onClick={() => setPicked(w.key)}>
                    {thisWeek?.workouts.find(g => g.key === w.key)?.done ? GLYPH.done : GLYPH.open} {w.name}
                </Chip>
            ))}
        </ToolbarRow>
    );

    return (
        <div className="flex flex-col gap-4">
            <ShadowBox as="section" label="Today" className="bg-nier-100-lighter border border-nier-150 px-3 py-3 flex flex-col">
                <h2 data-testid="today-heading" className="text-title tracking-wide text-nier-text-dark pb-1">
                    {heading(t.weekday, due?.name ?? null)}
                </h2>

                <RoutineRow plan={plan} date={today} done={data.checks.some(c => c.date === today)} onChanged={onChanged} onError={setError} />

                <div className={ROW}>
                    <span aria-hidden className={`${MARK} ${shown ? "" : "opacity-35"}`}>
                        {touched > finished ? GLYPH.started : stateGlyph(finished, shownRows.length)}
                    </span>
                    <span className={NAME}>Training</span>
                    <span data-testid="summary-training" className="text-label text-nier-text-dark/70 tabular-nums">
                        {shown ? `${finished} / ${shownRows.length}` : "—"}
                    </span>
                </div>

                <WeightRow
                    weight={summary.weight}
                    date={today}
                    today={data.weighins.find(w => w.date === today)?.lb ?? null}
                    onChanged={onChanged}
                    onError={setError}
                />
                <ErrorLine error={error} />
            </ShadowBox>

            {shown ? (
                <SessionCard
                    key={shown.key}
                    workout={shown}
                    movements={movements}
                    session={shownSession}
                    previous={summary.previous}
                    date={today}
                    chips={chips}
                    onChanged={onChanged}
                />
            ) : chips && (
                <Section title="Session">{chips}</Section>
            )}
        </div>
    );
};

// The Routine is one check for the date (body-plan R14). Its glyph is the
// check; its name opens the list of what to do. The list starts closed, so a
// Routine that is done is one row (body-ui R6, R7).
const RoutineRow = ({ plan, date, done, onChanged, onError }: {
    plan: Plan;
    date: string;
    done: boolean;
    onChanged: () => Promise<void> | void;
    onError: (reason: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const items = plan.routine.items;
    const label = done ? "Mark routine not done" : "Mark routine done";

    const toggle = async () => {
        onError("");
        try {
            await backend.checkBodyRoutine(date, !done);
            await onChanged();
        } catch (e) { onError(errorText(e)); }
    };

    return (
        <>
            <div data-testid="routine-row" className={ROW}>
                <button
                    onClick={toggle}
                    aria-label={label}
                    title={label}
                    aria-pressed={done}
                    data-testid="summary-routine"
                    className={`${MARK} self-stretch cursor-pointer hover:text-nier-dark`}
                >
                    {done ? GLYPH.done : GLYPH.open}
                </button>
                <button
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={open}
                    className={`${NAME} self-stretch cursor-pointer hover:text-nier-dark`}
                >
                    Routine
                </button>
                <span className="text-label text-nier-text-dark/70 tabular-nums">{items.length} items</span>
            </div>
            {open && (
                <ul data-testid="routine-items" className="pl-9 pb-2">
                    {items.map((item, i) => (
                        <li key={`${item.name}-${i}`} className="flex items-baseline justify-between gap-3 py-1 text-label">
                            <span className={done ? "text-nier-text-dark/50" : "text-nier-text-dark"}>{item.name}</span>
                            <span className="text-nier-text-dark/60 shrink-0 tabular-nums">{describeRoutineItem(item)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
};

// One Weigh-in for the date; saving again replaces it (body-plan R17). With
// none today the row holds the field; with one it holds the value, and a press
// on the value opens the field again (body-ui R9). Progress is read off the
// 7-day average, not the latest value (body-plan R18).
const WeightRow = ({ weight, date, today, onChanged, onError }: {
    weight: BodySummary["weight"];
    date: string;
    today: number | null;
    onChanged: () => Promise<void> | void;
    onError: (reason: string) => void;
}) => {
    const [text, setText] = useState(today != null ? String(today) : "");
    const [reopened, setReopened] = useState(false);
    const [saving, setSaving] = useState(false);

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const lb = Number(text.trim());
        if (text.trim() === "" || !Number.isFinite(lb) || lb <= 0) { onError("Enter your weight in pounds"); return; }
        onError("");
        setSaving(true);
        try {
            await backend.setBodyWeighIn(date, lb);
            setReopened(false);
            await onChanged();
        } catch (err) { onError(errorText(err)); } finally { setSaving(false); }
    };

    return (
        <form onSubmit={save} className={`${ROW} flex-wrap`}>
            <span aria-hidden className={MARK}>{today != null ? GLYPH.done : GLYPH.open}</span>
            <span className={NAME}>Weight</span>
            {today == null || reopened ? (
                <span className="flex items-center gap-2">
                    <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Weight lb"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-24 h-11 px-3 border border-nier-150 focus:outline focus:border-nier-dark tabular-nums"
                    />
                    <GlyphButton glyph={saving ? "…" : GLYPH.next} label="Save weigh-in" type="submit" solid disabled={saving} className="w-11 h-11" />
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => setReopened(true)}
                    aria-label="Change today's weigh-in"
                    title="Change today's weigh-in"
                    data-testid="weight-today"
                    className="text-label text-nier-text-dark tabular-nums self-stretch cursor-pointer hover:text-nier-dark"
                >
                    {formatLb(today)}
                </button>
            )}
            {weight.average != null && (
                <span className="text-label text-nier-text-dark/60 tabular-nums ml-auto">
                    avg <span data-testid="weight-average">{weight.average.toFixed(1)}</span>
                    {weight.change != null && <> · <span data-testid="weight-change">{signedLb(weight.change)}</span></>}
                </span>
            )}
        </form>
    );
};

export default TodayTab;
