import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { backend } from "../../../../api/backend";
import { errorText } from "../Finances/errorText";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { NumberField } from "./fields";
import { GLYPH, RULE_GLYPH, setPips } from "./glyphs";
import { GlyphButton } from "./marks";
import { pairEdge } from "./plan";
import { blankFields, prefill, sessionRows, valuesFromFields } from "./session";
import type { Row, SetFields } from "./session";
import { RULE_LABEL, describeRoutineItem, describeSet, formatLb, shortDate, signedLb, weekdayName } from "./text";
import { STRETCHES, WEIGHT, firstOpen, hintFor } from "./today";
import type { RowId } from "./today";
import type { BodyData, BodySummary, Movement, Plan, RoutineItem, Session, SetValues } from "../../../../types/body";

export type Ready = BodyData & { plan: Plan; summary: BodySummary };

type Props = { data: Ready; onChanged: () => Promise<void> | void };

/** The row the user closed by hand: nothing is selected until the next save. */
const NONE = Symbol("none");

// Today is one frame (body-today): a header band that names the day, one list
// that is the day in order — the Weigh-in, the Stretches, then the Session —
// and a hint bar that says what the selected row does. The Plan and the date
// decide the Session; nothing here chooses one. The first row that is not done
// is selected and open with the keyboard in its field, so opening Today is
// enough to start logging.
const TodayTab = ({ data, onChanged }: Props) => {
    const { plan, summary, today, movements, sessions } = data;
    const t = summary.today;
    const workout = plan.workouts.find(w => w.key === t.due) ?? null;
    const session = workout ? sessions.find(s => s.date === today && s.workoutKey === workout.key) ?? null : null;
    const rows = workout ? sessionRows(workout, movements, session) : [];
    const slots = rows.map(r => r.slot);

    const weighIn = data.weighins.find(w => w.date === today)?.lb ?? null;
    const stretched = data.checks.some(c => c.date === today);
    const day = { weighed: weighIn != null, stretched, rows };

    // A row the user opened by hand. Cleared after each save, so the selection
    // goes back to following the day.
    const [picked, setPicked] = useState<RowId | typeof NONE | null>(null);
    const selected: RowId | null = picked === NONE ? null : picked ?? firstOpen(day);
    const [error, setError] = useState("");

    const select = (id: RowId) => { setError(""); setPicked(selected === id ? NONE : id); };

    // Every write goes through here: it clears the hand-picked row and reloads.
    const act = async (run: () => Promise<unknown>) => {
        setError("");
        try {
            await run();
            setPicked(null);
            await onChanged();
        } catch (e) {
            setError(errorText(e));
        }
    };

    // The Session is created by its first Set or its first skip, so opening
    // Today on a training day writes nothing.
    const inSession = (run: (s: Session) => Promise<unknown>) => act(async () => {
        if (!workout) return;
        await run(session ?? await backend.startBodySession(today, workout.key));
    });

    return (
        <ShadowBox as="section" label="Today" className="bg-nier-100-lighter border border-nier-150 flex flex-col">
            <header data-testid="today-heading" className="min-h-10 bg-nier-150 flex items-center justify-between gap-3 px-3 py-1 uppercase tracking-widest text-nier-text-dark">
                <h2 data-testid="today-weekday" className="text-title tracking-wide">{weekdayName(t.weekday)}</h2>
                <span data-testid="today-workout" className="text-body">{workout?.name ?? "Rest"}</span>
            </header>

            <div>
                <ListRow
                    id={WEIGHT}
                    name="Weight"
                    glyph={weighIn != null ? GLYPH.done : GLYPH.open}
                    value={weighIn != null ? formatLb(weighIn) : "—"}
                    selected={selected === WEIGHT}
                    onSelect={select}
                >
                    <WeightDetail
                        weight={summary.weight}
                        today={weighIn}
                        onSave={lb => act(() => backend.setBodyWeighIn(today, lb))}
                        onError={setError}
                    />
                </ListRow>

                <ListRow
                    id={STRETCHES}
                    name="Stretches"
                    glyph={stretched ? GLYPH.done : GLYPH.open}
                    value={String(plan.routine.items.length)}
                    selected={selected === STRETCHES}
                    onSelect={select}
                >
                    <StretchDetail items={plan.routine.items} done={stretched} onMark={done => act(() => backend.checkBodyRoutine(today, done))} />
                </ListRow>

                {rows.map((row, i) => {
                    const { movement, sets, skipped } = row;
                    return (
                        <ListRow
                            key={movement._id}
                            id={movement._id}
                            testId={`movement-${movement.name}`}
                            name={movement.name}
                            glyph={rowGlyph(row)}
                            rule={movement}
                            value={skipped ? GLYPH.skipped : setPips(sets.length, movement.sets)}
                            valueLabel={skipped ? "Skipped" : `${sets.length} of ${movement.sets} sets`}
                            paired={pairEdge(slots, i) !== null}
                            selected={selected === movement._id}
                            onSelect={select}
                        >
                            <MovementDetail
                                row={row}
                                previous={summary.previous[movement._id]}
                                onSave={values => inSession(s => backend.addBodySet(s._id, movement._id, values))}
                                onSkip={skip => inSession(s => backend.skipBodyMovement(s._id, movement._id, skip))}
                                onError={setError}
                            />
                        </ListRow>
                    );
                })}
            </div>

            <footer
                data-testid="today-hint"
                role={error ? "alert" : undefined}
                className={`min-h-10 flex items-center px-3 py-2 border-t border-nier-150 bg-nier-100 text-label ${error ? "text-red-800" : "text-nier-text-dark/70"}`}
            >
                {error || hintFor(selected, day)}
            </footer>
        </ShadowBox>
    );
};

function rowGlyph({ skipped, done, sets }: Row): string {
    if (skipped) return GLYPH.skipped;
    if (done) return GLYPH.done;
    return sets.length > 0 ? GLYPH.started : GLYPH.open;
}

// Every row of Today has this one shape: a state glyph, a name, a value. The
// selected row is inverted, carries the caret in place of its glyph, and is
// open: its fields show under it. A row that is not selected is one line.
const ListRow = ({ id, name, glyph, value, valueLabel, rule, paired = false, selected, onSelect, testId, children }: {
    id: RowId;
    name: string;
    glyph: string;
    value: string;
    /** The value in words, when the value is glyphs. */
    valueLabel?: string;
    /** The Movement whose Rule glyph the row shows. */
    rule?: Movement;
    paired?: boolean;
    selected: boolean;
    onSelect: (id: RowId) => void;
    testId?: string;
    children: ReactNode;
}) => (
    <div
        data-testid={testId ?? `row-${id}`}
        data-open={selected}
        className={`border-b border-nier-150/30 last:border-0 ${paired ? "border-l-4 border-l-nier-150" : ""}`}
    >
        <button
            onClick={() => onSelect(id)}
            aria-expanded={selected}
            className={`w-full flex items-center gap-3 px-3 min-h-12 text-left cursor-pointer transition-colors ${
                selected ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark hover:bg-nier-150/40"
            }`}
        >
            <span aria-hidden data-testid="mark" className="w-6 shrink-0 text-center text-body leading-none">{selected ? GLYPH.next : glyph}</span>
            <span className="flex-1 min-w-0 text-body truncate">{name}</span>
            {rule && (
                <span title={RULE_LABEL[rule.rule]} aria-label={RULE_LABEL[rule.rule]} className="text-eyebrow opacity-60 shrink-0">
                    {RULE_GLYPH[rule.rule]}
                </span>
            )}
            <span data-testid="state" aria-label={valueLabel} className="min-w-14 shrink-0 text-right text-label tracking-widest tabular-nums">{value}</span>
        </button>
        {selected && <div className="pl-12 pr-3 py-3 flex flex-col gap-2">{children}</div>}
    </div>
);

const EYEBROW = "w-20 shrink-0 text-eyebrow uppercase tracking-widest text-nier-text-dark/50";

// One Weigh-in for the date; saving again replaces it (body-plan R17). The
// trend is read off the 7-day average, not the latest value (body-plan R18).
const WeightDetail = ({ weight, today, onSave, onError }: {
    weight: BodySummary["weight"];
    today: number | null;
    onSave: (lb: number) => Promise<void>;
    onError: (reason: string) => void;
}) => {
    const [text, setText] = useState(today != null ? String(today) : "");
    const [saving, setSaving] = useState(false);

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const lb = Number(text.trim());
        if (text.trim() === "" || !Number.isFinite(lb) || lb <= 0) { onError("Enter your weight in pounds"); return; }
        setSaving(true);
        try { await onSave(lb); } finally { setSaving(false); }
    };

    return (
        <form onSubmit={save} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="w-32"><NumberField label="Weight lb" value={text} onChange={setText} decimal autoFocus /></div>
                <GlyphButton glyph={saving ? "…" : GLYPH.next} label="Save weigh-in" type="submit" solid disabled={saving} />
            </div>
            {weight.average != null && (
                <p className="flex items-baseline text-label text-nier-text-dark/70 tabular-nums">
                    <span className={EYEBROW}>Avg 7d</span>
                    <span data-testid="weight-average">{weight.average.toFixed(1)}</span>
                    {weight.change != null && <span data-testid="weight-change" className="ml-3">{signedLb(weight.change)}</span>}
                </p>
            )}
        </form>
    );
};

// The Stretches are one check for the date (body-plan R14): the list is what
// to do, and the control says that it was done. Nothing about a single stretch
// is recorded.
const StretchDetail = ({ items, done, onMark }: {
    items: RoutineItem[];
    done: boolean;
    onMark: (done: boolean) => Promise<void>;
}) => (
    <>
        <ul data-testid="stretch-items">
            {items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-baseline justify-between gap-3 py-1 text-label">
                    <span className={done ? "text-nier-text-dark/50" : "text-nier-text-dark"}>{item.name}</span>
                    <span className="text-nier-text-dark/60 shrink-0 tabular-nums">{describeRoutineItem(item)}</span>
                </li>
            ))}
        </ul>
        <div>
            {done
                ? <GlyphButton glyph={GLYPH.remove} label="Clear the stretches mark" onClick={() => onMark(false)} />
                : <GlyphButton glyph={GLYPH.next} label="Mark stretches done" solid autoFocus onClick={() => onMark(true)} />}
        </div>
    </>
);

const MovementDetail = ({ row, previous, onSave, onSkip, onError }: {
    row: Row;
    previous: { date: string; sets: Session["sets"] } | undefined;
    onSave: (values: SetValues) => Promise<void>;
    onSkip: (skipped: boolean) => Promise<void>;
    onError: (reason: string) => void;
}) => {
    const { movement, sets, skipped } = row;
    return (
        <>
            {previous && (
                <p data-testid="last" className="flex items-baseline text-label text-nier-text-dark/60 tabular-nums">
                    <span className={EYEBROW}>Last {shortDate(previous.date)}</span>
                    <span>{previous.sets.map(s => describeSet(movement, s)).join(" / ")}</span>
                </p>
            )}
            {sets.map((s, n) => (
                <p key={s.id} className="flex items-baseline text-label text-nier-text-dark tabular-nums">
                    <span className={EYEBROW}>Set {n + 1}</span>
                    <span>{describeSet(movement, s)}</span>
                </p>
            ))}
            {skipped ? (
                <div><GlyphButton glyph={GLYPH.skipped} label="Undo skip" pressed onClick={() => onSkip(false)} /></div>
            ) : (
                // Keyed on the Set, so each Set starts from the last Session's
                // value rather than from what was just typed.
                <SetForm
                    key={sets.length}
                    movement={movement}
                    setNumber={sets.length + 1}
                    start={prefill(movement, previous, sets.length + 1)}
                    canSkip={sets.length === 0}
                    onSave={onSave}
                    onSkip={() => onSkip(true)}
                    onError={onError}
                />
            )}
        </>
    );
};

// The fields a Set has depend on its Movement (body-plan R21): seconds for a
// hold; full reps otherwise, with partial and assisted reps only past failure.
// It is a form, so the Enter key saves as the ➤ control does.
const SetForm = ({ movement, setNumber, start, canSkip, onSave, onSkip, onError }: {
    movement: Movement;
    setNumber: number;
    start: string;
    canSkip: boolean;
    onSave: (values: SetValues) => Promise<void>;
    onSkip: () => void;
    onError: (reason: string) => void;
}) => {
    const hold = movement.kind === "hold";
    const [fields, setFields] = useState<SetFields>({ ...blankFields, [hold ? "seconds" : "full"]: start });
    const [saving, setSaving] = useState(false);
    const set = (key: keyof SetFields) => (v: string) => setFields(f => ({ ...f, [key]: v }));

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const { values, error: reason } = valuesFromFields(movement, fields);
        if (!values) { onError(reason ?? "Check the numbers"); return; }
        setSaving(true);
        try { await onSave(values); } finally { setSaving(false); }
    };

    const field = "flex-1 basis-20 min-w-16 max-w-32";

    return (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2 pt-1">
            {hold ? (
                <div className={field}><NumberField label="Seconds" value={fields.seconds} onChange={set("seconds")} autoFocus /></div>
            ) : (
                <>
                    <div className={field}><NumberField label="Full" value={fields.full} onChange={set("full")} autoFocus /></div>
                    {movement.rule === "pastFailure" && (
                        <>
                            <div className={field}><NumberField label="Partial" value={fields.partial} onChange={set("partial")} /></div>
                            <div className={field}><NumberField label="Assisted" value={fields.assisted} onChange={set("assisted")} /></div>
                        </>
                    )}
                </>
            )}
            {movement.loaded && (
                <div className={field}><NumberField label="Load lb" value={fields.load} onChange={set("load")} decimal /></div>
            )}
            <GlyphButton glyph={saving ? "…" : GLYPH.next} label={`Save set ${setNumber}`} type="submit" solid disabled={saving} />
            {canSkip && <GlyphButton glyph={GLYPH.skipped} label="Skip" onClick={onSkip} className="ml-auto" />}
        </form>
    );
};

export default TodayTab;
