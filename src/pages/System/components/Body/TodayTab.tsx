import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { backend } from "../../../../api/backend";
import { errorText } from "../Finances/errorText";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { NumberField } from "./fields";
import { GLYPH, RULE_GLYPH, setPips } from "./glyphs";
import { GlyphButton } from "./marks";
import { pairEdge } from "./plan";
import { blankFields, prefill, sessionRows, stepped, valuesFromFields } from "./session";
import type { Row, SetFields } from "./session";
import { RULE_LABEL, describeRoutineItem, describeSet, formatLb, shortDate, signedLb, weekdayName } from "./text";
import { STRETCHES, WEIGHT, finePointer, firstOpen, hintFor, nextAfter } from "./today";
import type { RowId } from "./today";
import type { BodyData, BodySummary, Movement, Plan, RoutineItem, Session, SetValues } from "../../../../types/body";

export type Ready = BodyData & { plan: Plan; summary: BodySummary };

type Props = { data: Ready; onChanged: () => Promise<void> | void };

/**
 * The row the selection rests on. `saved` says that a save just ran there, so
 * the selection continues from it (body-flow R21) rather than staying on it.
 */
type Cursor = { id: RowId; saved: boolean } | null;

// Today is one frame (body-today, body-flow): a header band that names the
// day, a list that is the day in order — the Weigh-in, the Stretches, then the
// Session — a pane that holds the fields of the selected row, and a hint bar
// that says what that row does. The list only selects; a row never opens, so
// nothing moves when the selection does, and the controls are always in one
// place. The Plan and the date decide the Session; nothing here chooses one.
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

    // Nothing picked: the first row of the day that is not done. After a save,
    // the selection continues from the saved row; a row the user passed over
    // does not take it back.
    const [cursor, setCursor] = useState<Cursor>(null);
    const selected: RowId | null = cursor === null ? firstOpen(day) : cursor.saved ? nextAfter(cursor.id, day) : cursor.id;
    const [error, setError] = useState("");

    const select = (id: RowId) => { setError(""); setCursor({ id, saved: false }); };

    // Every write goes through here: it reloads, and moves the selection on from `id`.
    const act = async (id: RowId, run: () => Promise<unknown>) => {
        setError("");
        try {
            await run();
            setCursor({ id, saved: true });
            await onChanged();
        } catch (e) {
            setError(errorText(e));
        }
    };

    // The Session is created by its first Set or its first skip, so opening
    // Today on a training day writes nothing.
    const inSession = (id: RowId, run: (s: Session) => Promise<unknown>) => act(id, async () => {
        if (!workout) return;
        await run(session ?? await backend.startBodySession(today, workout.key));
    });

    const row = rows.find(r => r.movement._id === selected);

    // On a phone the list is short and scrolls; the selected row stays in sight.
    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
    }, [selected]);

    return (
        <ShadowBox
            as="section"
            label="Today"
            wrapperClassName="flex-1 min-h-0 flex flex-col"
            className="flex-1 min-h-0 flex flex-col bg-nier-100-lighter border border-nier-150"
        >
            <header data-testid="today-heading" className="min-h-10 shrink-0 bg-nier-150 flex items-center justify-between gap-3 px-3 py-1 uppercase tracking-widest text-nier-text-dark">
                <h2 data-testid="today-weekday" className="text-title tracking-wide">{weekdayName(t.weekday)}</h2>
                <span data-testid="today-workout" className="text-body">{workout?.name ?? "Rest"}</span>
            </header>

            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                <div ref={listRef} data-testid="today-list" className="flex-1 min-h-0 overflow-y-auto md:flex-none md:w-96 md:border-r md:border-nier-150">
                    <ListRow
                        id={WEIGHT}
                        name="Weight"
                        glyph={weighIn != null ? GLYPH.done : GLYPH.open}
                        value={weighIn != null ? formatLb(weighIn) : "—"}
                        selected={selected === WEIGHT}
                        onSelect={select}
                    />
                    <ListRow
                        id={STRETCHES}
                        name="Stretches"
                        glyph={stretched ? GLYPH.done : GLYPH.open}
                        value={String(plan.routine.items.length)}
                        selected={selected === STRETCHES}
                        onSelect={select}
                    />
                    {rows.map((r, i) => (
                        <ListRow
                            key={r.movement._id}
                            id={r.movement._id}
                            testId={`movement-${r.movement.name}`}
                            name={r.movement.name}
                            glyph={rowGlyph(r)}
                            rule={r.movement}
                            value={r.skipped ? GLYPH.skipped : setPips(r.sets.length, r.movement.sets)}
                            valueLabel={r.skipped ? "Skipped" : `${r.sets.length} of ${r.movement.sets} sets`}
                            paired={pairEdge(slots, i) !== null}
                            selected={selected === r.movement._id}
                            onSelect={select}
                        />
                    ))}
                </div>

                {/* Keyed on the row and its Sets, so each Set starts from the last Session's value. */}
                <div
                    key={`${selected}:${row?.sets.length ?? ""}`}
                    data-testid="today-pane"
                    className="shrink-0 max-h-[60%] overflow-y-auto border-t border-nier-150 md:border-t-0 md:flex-1 md:max-h-none p-3 md:p-6"
                >
                    {/* A column of bounded width, so a control is never far from what it acts on. */}
                    <div className="w-full max-w-lg flex flex-col gap-3">
                    {selected === null && (
                        <p data-testid="today-complete" className="text-heading uppercase tracking-widest text-nier-text-dark">
                            <span aria-hidden className="mr-3">{GLYPH.done}</span>Complete
                        </p>
                    )}
                    {selected === WEIGHT && (
                        <WeightPane
                            weight={summary.weight}
                            today={weighIn}
                            onSave={lb => act(WEIGHT, () => backend.setBodyWeighIn(today, lb))}
                            onError={setError}
                        />
                    )}
                    {selected === STRETCHES && (
                        <StretchPane items={plan.routine.items} done={stretched} onMark={done => act(STRETCHES, () => backend.checkBodyRoutine(today, done))} />
                    )}
                    {row && (
                        <MovementPane
                            row={row}
                            previous={summary.previous[row.movement._id]}
                            onSave={values => inSession(row.movement._id, s => backend.addBodySet(s._id, row.movement._id, values))}
                            onSkip={skip => inSession(row.movement._id, s => backend.skipBodyMovement(s._id, row.movement._id, skip))}
                            onError={setError}
                        />
                    )}
                    </div>
                </div>
            </div>

            <footer
                data-testid="today-hint"
                role={error ? "alert" : undefined}
                className={`min-h-10 shrink-0 flex items-center px-3 py-2 border-t border-nier-150 bg-nier-100 text-label ${error ? "text-red-800" : "text-nier-text-dark/70"}`}
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

// Every row of Today has this one shape and this one height: a state glyph, a
// name, a value. The selected row is inverted and carries the caret in place
// of its glyph. Its fields are in the pane, not under it.
const ListRow = ({ id, name, glyph, value, valueLabel, rule, paired = false, selected, onSelect, testId }: {
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
}) => (
    <button
        type="button"
        data-testid={testId ?? `row-${id}`}
        data-selected={selected}
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(id)}
        className={`w-full flex items-center gap-3 px-3 h-11 text-left cursor-pointer transition-colors border-b border-nier-150/30 ${
            paired ? "border-l-4 border-l-nier-150" : ""
        } ${selected ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark hover:bg-nier-150/40"}`}
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
);

const EYEBROW = "text-eyebrow uppercase tracking-widest text-nier-text-dark/50";
const FACT = "flex items-baseline gap-3 text-label text-nier-text-dark/70 tabular-nums";

/** The first line of the pane: what is selected, and where in it the user is. */
const PaneTitle = ({ name, at }: { name: string; at?: string }) => (
    <div className="flex items-baseline justify-between gap-3">
        <h3 data-testid="pane-title" className="text-heading uppercase tracking-widest text-nier-text-dark truncate">{name}</h3>
        {at && <span data-testid="pane-at" className={`${EYEBROW} shrink-0`}>{at}</span>}
    </div>
);

/**
 * The one large number of the pane. It is a field, so it can be typed into,
 * but it takes the keyboard on its own only where there is a mouse: on a
 * phone the keyboard stays shut until the number is pressed (body-flow R19).
 */
const BigNumber = ({ label, value, onChange, decimal = false, placeholder, wide = false }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    decimal?: boolean;
    placeholder?: string;
    wide?: boolean;
}) => (
    <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        aria-label={label}
        autoFocus={finePointer()}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${wide ? "w-40" : "w-16 md:w-24"} h-12 min-w-0 bg-transparent text-center text-display tabular-nums text-nier-text-dark placeholder:text-nier-text-dark/25 border-b border-nier-dark focus:outline-none focus:border-b-2`}
    />
);

// One Weigh-in for the date; saving again replaces it (body-plan R17). The
// trend is read off the 7-day average, not the latest value (body-plan R18).
// Typed, with no stepper: a Weigh-in moves by tenths over a range of pounds.
const WeightPane = ({ weight, today, onSave, onError }: {
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
        <>
            <PaneTitle name="Weight" at="lb" />
            {weight.average != null && (
                <p className={FACT}>
                    <span className={EYEBROW}>Avg 7d</span>
                    <span data-testid="weight-average">{weight.average.toFixed(1)}</span>
                    {weight.change != null && <span data-testid="weight-change">{signedLb(weight.change)}</span>}
                </p>
            )}
            <form onSubmit={save} className="flex items-center gap-3 pt-2">
                <BigNumber label="Weight lb" value={text} onChange={setText} decimal wide placeholder={weight.latest ? weight.latest.lb.toFixed(1) : undefined} />
                <GlyphButton glyph={saving ? "…" : GLYPH.save} label="Save weigh-in" type="submit" solid disabled={saving || text.trim() === ""} />
            </form>
        </>
    );
};

// The Stretches are one check for the date (body-plan R14): the list is what
// to do, and the control says that it was done. Nothing about a single stretch
// is recorded.
const StretchPane = ({ items, done, onMark }: {
    items: RoutineItem[];
    done: boolean;
    onMark: (done: boolean) => Promise<void>;
}) => (
    <>
        <PaneTitle name="Stretches" at={String(items.length)} />
        {/* Above the list: on a phone the pane is short, and the control must not scroll out of reach. */}
        <div>
            {done
                ? <GlyphButton glyph={GLYPH.remove} label="Clear the stretches mark" onClick={() => onMark(false)} />
                : <GlyphButton glyph={GLYPH.save} label="Mark stretches done" solid autoFocus={finePointer()} onClick={() => onMark(true)} />}
        </div>
        <ul data-testid="stretch-items" className="md:columns-2 md:gap-8">
            {items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-baseline justify-between gap-3 py-1 text-label break-inside-avoid">
                    <span className={done ? "text-nier-text-dark/50" : "text-nier-text-dark"}>{item.name}</span>
                    <span className="text-nier-text-dark/60 shrink-0 tabular-nums">{describeRoutineItem(item)}</span>
                </li>
            ))}
        </ul>
    </>
);

const MovementPane = ({ row, previous, onSave, onSkip, onError }: {
    row: Row;
    previous: { date: string; sets: Session["sets"] } | undefined;
    onSave: (values: SetValues) => Promise<void>;
    onSkip: (skipped: boolean) => Promise<void>;
    onError: (reason: string) => void;
}) => {
    const { movement, sets, skipped } = row;
    return (
        <>
            <PaneTitle name={movement.name} at={skipped ? undefined : `Set ${sets.length + 1} / ${movement.sets}`} />
            {/* The Rule in words: the list has room for the glyph only. */}
            <p data-testid="pane-rule" className={FACT}>
                <span aria-hidden>{RULE_GLYPH[movement.rule]}</span>
                <span className="uppercase tracking-widest">{RULE_LABEL[movement.rule]}</span>
            </p>
            {previous && (
                <p data-testid="last" className={FACT}>
                    <span className={EYEBROW}>Last {shortDate(previous.date)}</span>
                    <span>{previous.sets.map(s => describeSet(movement, s)).join(" / ")}</span>
                </p>
            )}
            {skipped ? (
                <div><GlyphButton glyph={GLYPH.skipped} label="Undo skip" pressed onClick={() => onSkip(false)} /></div>
            ) : (
                <SetForm
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

// A Set is one number: seconds for a hold, clean full reps otherwise. It
// starts at the same Set of the last Session, so a repeat is one press on ✓,
// and − and + make the small change that most Sets are (body-flow D2). It is
// a form, so the Enter key saves as the ✓ control does.
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
    const key = hold ? "seconds" : "full";
    const [fields, setFields] = useState<SetFields>({ ...blankFields, [key]: start });
    const [saving, setSaving] = useState(false);
    const set = (k: keyof SetFields) => (v: string) => setFields(f => ({ ...f, [k]: v }));

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const { values, error: reason } = valuesFromFields(movement, fields);
        if (!values) { onError(reason ?? "Check the numbers"); return; }
        setSaving(true);
        try { await onSave(values); } finally { setSaving(false); }
    };

    const size = hold ? 5 : 1;
    const unit = hold ? "seconds" : "rep";
    const step = (by: number) => setFields(f => ({ ...f, [key]: stepped(f[key], by) }));

    return (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2 md:gap-3 pt-2">
            <GlyphButton glyph={GLYPH.less} label={hold ? `${size} ${unit} less` : `One ${unit} less`} onClick={() => step(-size)} />
            <BigNumber label={hold ? "Seconds" : "Reps"} value={fields[key]} onChange={set(key)} />
            <GlyphButton glyph={GLYPH.more} label={hold ? `${size} ${unit} more` : `One ${unit} more`} onClick={() => step(size)} />
            {movement.loaded && (
                <div className="w-28"><NumberField label="Load lb" value={fields.load} onChange={set("load")} decimal /></div>
            )}
            <GlyphButton glyph={saving ? "…" : GLYPH.save} label={`Save set ${setNumber}`} type="submit" solid disabled={saving || fields[key].trim() === ""} />
            {canSkip && <GlyphButton glyph={GLYPH.skipped} label="Skip" onClick={onSkip} className="ml-auto" />}
        </form>
    );
};

export default TodayTab;
