import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { backend } from "../../../../api/backend";
import { TextField } from "../../../../components/common/TextField";
import { DragHandle, SortableList } from "../../../../components/common/Sortable";
import { useSortableRow } from "../../../../hooks/useSortableRow";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import { errorText } from "../Finances/errorText";
import { NumberField, Select, Toggle } from "./fields";
import { Frame, ListRow, PaneTitle, Stepper } from "./frame";
import { BOUND, EYEBROW, rowClass } from "./frameStyle";
import { GLYPH, RULE_GLYPH } from "./glyphs";
import { Chip, GlyphButton } from "./marks";
import { addSlot, afterMove, nextWorkout, pairEdge, removeSlot, replaceSlot, togglePair } from "./plan";
import { RULE_LABEL, WEEKDAYS, describeRoutineItem, weekdayName } from "./text";
import type { Ready } from "./TodayTab";
import type { Movement, MovementInput, MovementKind, Phase, RoutineItem, Rule, Slot, Workout, WorkoutKey } from "../../../../types/body";

type Props = { data: Ready; onChanged: () => Promise<void> | void };

// What the Plan view can show. One list at a time (body-ui R18): seven lists
// with the same shape, stacked, were a long scroll for a view opened to change
// one.
type Shown = WorkoutKey | "routine" | "phase" | "unused";

// The rows of a list that are not a Movement or a stretch.
const ADD = "add";
const DAY = "day";
const PHASE = "phase";
const slotId = (movementId: string) => `slot:${movementId}`;
const stretchId = (index: number) => `stretch:${index}`;
const unusedId = (movementId: string) => `unused:${movementId}`;

// Every edit to the Plan happens here (body-plan R10), away from the screen
// used each day, in the structure of that screen (body-panes R1–R15): chips
// choose a list, the list selects a row, and the pane holds the editor of that
// row. There is no modal: a modal covers the list, and a pane keeps it in
// view. A Workout's Movements, their order and their Pairs are one list, and
// each change writes that whole list.
const PlanTab = ({ data, onChanged }: Props) => {
    const { plan, movements, summary } = data;
    const [error, setError] = useState("");
    // Bumped by each write, so the pane starts again from the saved values.
    const [writes, setWrites] = useState(0);

    const inPlan = new Set(plan.workouts.flatMap(w => w.slots.map(s => s.movementId)));
    const unused = movements.filter(m => !inPlan.has(m._id));
    const byWeekday = [...plan.workouts].sort((a, b) => a.weekday - b.weekday);
    const byId = new Map(movements.map(m => [m._id, m]));

    // Opens on the Workout that is due next: the one most likely to be changed.
    const [pickedList, setPickedList] = useState<Shown | null>(null);
    const fallback: Shown = nextWorkout(plan.workouts, summary.today.weekday, summary.today.dueDone)?.key ?? "routine";
    // The last unused Movement can be deleted while its list is open.
    const shown: Shown = pickedList === "unused" && unused.length === 0 ? fallback : pickedList ?? fallback;
    const workout = plan.workouts.find(w => w.key === shown) ?? null;
    const items = plan.routine.items;

    // The rows of the shown list, and the one a list opens on: its first
    // Movement or stretch (R14), or the row that adds one when it has none.
    const rowIds: string[] = workout ? [ADD, DAY, ...workout.slots.map(s => slotId(s.movementId))]
        : shown === "routine" ? [ADD, ...items.map((_, i) => stretchId(i))]
        : shown === "phase" ? [PHASE]
        : unused.map(m => unusedId(m._id));
    const first = workout ? rowIds[2] ?? ADD : shown === "routine" ? rowIds[1] ?? ADD : rowIds[0] ?? null;
    const [pickedRow, setPickedRow] = useState<string | null>(null);
    const selected = pickedRow !== null && rowIds.includes(pickedRow) ? pickedRow : first;

    const show = (list: Shown) => { setError(""); setPickedRow(null); setPickedList(list); };
    const select = (id: string) => { setError(""); setPickedRow(id); };

    // Every write goes through here. `then` is the row to select after it: the
    // same row after a save, the row above after a removal (R13).
    const run = async (action: () => Promise<unknown>, then?: string | null) => {
        setError("");
        try {
            await action();
            await onChanged();
            setWrites(n => n + 1);
            if (then !== undefined) setPickedRow(then);
        } catch (e) {
            setError(errorText(e));
        }
    };

    const entries: { id: Shown; label: string }[] = [
        ...byWeekday.map(w => ({ id: w.key as Shown, label: w.name })),
        { id: "routine", label: "Stretches" },
        { id: "phase", label: "Phase" },
        ...(unused.length > 0 ? [{ id: "unused" as Shown, label: "Unused" }] : []),
    ];

    const slotIndex = workout ? workout.slots.findIndex(s => slotId(s.movementId) === selected) : -1;
    const slotMovement = workout && slotIndex >= 0 ? byId.get(workout.slots[slotIndex].movementId) : undefined;
    const stretchIndex = shown === "routine" && selected?.startsWith("stretch:") ? Number(selected.slice(8)) : -1;
    const unusedMovement = shown === "unused" ? unused.find(m => unusedId(m._id) === selected) : undefined;

    const hint = (): string => {
        if (workout && selected === ADD) return `Adds a Movement to ${workout.name}.`;
        if (workout && selected === DAY) return `Moves ${workout.name} to another weekday.`;
        if (slotMovement) return `Changes ${slotMovement.name} in each Workout that uses it.`;
        if (shown === "routine" && selected === ADD) return "Adds a stretch to the morning stretches.";
        if (stretchIndex >= 0 && items[stretchIndex]) return `Changes ${items[stretchIndex].name}.`;
        if (selected === PHASE) return "Sets the Phase and its two weights.";
        if (unusedMovement) return `Changes ${unusedMovement.name}, or deletes it.`;
        return "";
    };

    return (
        <Frame
            id="plan"
            label="Plan"
            title="Plan"
            aside={plan.phase.name}
            selected={selected}
            paneKey={`${shown}:${selected}:${writes}`}
            hint={hint()}
            error={error}
            wide
            toolbar={
                <ToolbarRow>
                    {entries.map(e => (
                        <Chip key={e.id} testId={`plan-${e.id}`} active={shown === e.id} onClick={() => show(e.id)}>{e.label}</Chip>
                    ))}
                </ToolbarRow>
            }
            list={
                <>
                    {workout && (
                        <div data-testid={`workout-${workout.key}`}>
                            <ListRow id={ADD} name="" label="Add movement" glyph={GLYPH.add} selected={selected === ADD} onSelect={select} />
                            <ListRow id={DAY} name="Day" glyph="" value={weekdayName(workout.weekday)} selected={selected === DAY} onSelect={select} />
                            <SortableList onMove={(from, to) => run(() => backend.updateBodyWorkout(workout.key, { slots: afterMove(workout.slots, from, to) }))}>
                                {workout.slots.map((slot, i) => {
                                    const movement = byId.get(slot.movementId);
                                    if (!movement) return null;
                                    return (
                                        <SlotRow
                                            key={slot.movementId}
                                            edge={pairEdge(workout.slots, i)}
                                            movement={movement}
                                            index={i}
                                            selected={selected === slotId(movement._id)}
                                            onSelect={() => select(slotId(movement._id))}
                                        />
                                    );
                                })}
                            </SortableList>
                        </div>
                    )}
                    {shown === "routine" && (
                        <div data-testid="plan-list-routine">
                            <ListRow id={ADD} name="" label="New stretch" glyph={GLYPH.add} selected={selected === ADD} onSelect={select} />
                            {items.map((item, i) => (
                                <ListRow
                                    key={`${item.name}-${i}`}
                                    id={stretchId(i)}
                                    testId={`stretch-${item.name}`}
                                    name={item.name}
                                    glyph=""
                                    value={describeRoutineItem(item)}
                                    selected={selected === stretchId(i)}
                                    onSelect={select}
                                />
                            ))}
                        </div>
                    )}
                    {shown === "phase" && (
                        <ListRow id={PHASE} name={plan.phase.name} glyph="" value={`${plan.phase.startLb} → ${plan.phase.targetLb}`} selected onSelect={select} />
                    )}
                    {shown === "unused" && unused.map(m => (
                        <ListRow
                            key={m._id}
                            id={unusedId(m._id)}
                            testId={`unused-${m.name}`}
                            name={m.name}
                            glyph=""
                            value={`${m.sets} × ${RULE_GLYPH[m.rule]}`}
                            selected={selected === unusedId(m._id)}
                            onSelect={select}
                        />
                    ))}
                </>
            }
            pane={
                <div className={BOUND}>
                    {workout && selected === ADD && (
                        <AddPane
                            workout={workout}
                            movements={movements}
                            onAdd={movementId => run(async () => {
                                const id = await movementId();
                                await backend.updateBodyWorkout(workout.key, { slots: addSlot(workout.slots, id) });
                                setPickedRow(slotId(id));
                            })}
                            onError={setError}
                        />
                    )}
                    {workout && selected === DAY && (
                        <DayPane
                            workout={workout}
                            workouts={plan.workouts}
                            onPick={weekday => run(() => backend.updateBodyWorkout(workout.key, { weekday }))}
                        />
                    )}
                    {workout && slotMovement && (
                        <SlotPane
                            workout={workout}
                            index={slotIndex}
                            movement={slotMovement}
                            data={data}
                            onSave={input => run(() => backend.updateBodyMovement(slotMovement._id, input))}
                            onSlots={(slots, then) => run(() => backend.updateBodyWorkout(workout.key, { slots }), then)}
                            onError={setError}
                        />
                    )}
                    {shown === "routine" && (selected === ADD || items[stretchIndex]) && (
                        <StretchPane
                            item={items[stretchIndex]}
                            onSave={next => run(
                                () => backend.updateBodyRoutine(stretchIndex >= 0 ? items.map((it, i) => (i === stretchIndex ? next : it)) : [...items, next]),
                                stretchIndex >= 0 ? undefined : stretchId(items.length),
                            )}
                            onRemove={() => run(
                                () => backend.updateBodyRoutine(items.filter((_, i) => i !== stretchIndex)),
                                stretchIndex > 0 ? stretchId(stretchIndex - 1) : null,
                            )}
                            onError={setError}
                        />
                    )}
                    {selected === PHASE && <PhasePane phase={plan.phase} onSave={phase => run(() => backend.updateBodyPhase(phase))} onError={setError} />}
                    {unusedMovement && (
                        <UnusedPane
                            movement={unusedMovement}
                            onSave={input => run(() => backend.updateBodyMovement(unusedMovement._id, input))}
                            // A Movement with Sets is history; the server refuses to delete it (body-plan D15).
                            onDelete={() => run(() => backend.removeBodyMovement(unusedMovement._id), null)}
                            onError={setError}
                        />
                    )}
                </div>
            }
        />
    );
};

// The two rows of a Pair end in the two halves of one bracket.
const BRACKET = { first: "┐", second: "┘" } as const;

// A Movement of a Workout. Not the shared ListRow: it is a drag target with a
// handle inside it, and a button cannot hold a button.
const SlotRow = ({ edge, movement, index, selected, onSelect }: {
    edge: "first" | "second" | null;
    movement: Movement;
    index: number;
    selected: boolean;
    onSelect: () => void;
}) => {
    const { ref, handleRef, isDragging } = useSortableRow(movement._id, index);
    return (
        <div
            ref={ref}
            onClick={onSelect}
            data-testid={`slot-${movement.name}`}
            data-pair={edge ?? undefined}
            data-selected={selected}
            aria-current={selected ? "true" : undefined}
            className={`${rowClass(selected)} gap-1 px-0 pr-3 ${isDragging ? "bg-nier-150/50" : ""}`}
        >
            <DragHandle handleRef={handleRef} label={`Reorder ${movement.name}`} className={selected ? "text-nier-text-light/60" : "text-nier-text-dark/50"} />
            <span className="flex-1 min-w-0 text-body truncate">{movement.name}</span>
            <span title={RULE_LABEL[movement.rule]} className="text-label shrink-0 tabular-nums opacity-80">
                {movement.sets} × {RULE_GLYPH[movement.rule]}
            </span>
            <span aria-label={edge ? "Pair" : undefined} className="w-4 shrink-0 text-body leading-none opacity-60">{edge ? BRACKET[edge] : ""}</span>
        </div>
    );
};

/** A line of a pane: what the control is for, then the control. */
const Line = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex items-center gap-3">
        <span className={`${EYEBROW} w-20 shrink-0`}>{label}</span>
        {children}
    </div>
);

type MovementDraft = { name: string; kind: MovementKind; rule: Rule; sets: string; loaded: boolean };

const draftOf = (m?: Movement): MovementDraft =>
    m ? { name: m.name, kind: m.kind, rule: m.rule, sets: String(m.sets), loaded: m.loaded }
      : { name: "", kind: "reps", rule: "pastFailure", sets: "2", loaded: false };

function inputOf(draft: MovementDraft): { input?: MovementInput; error?: string } {
    const name = draft.name.trim();
    if (!name) return { error: "Enter a name" };
    const sets = Number(draft.sets.trim());
    if (!Number.isInteger(sets) || sets < 1 || sets > 10) return { error: "Sets is a whole number from 1 to 10" };
    return { input: { name, kind: draft.kind, rule: draft.rule, sets, loaded: draft.loaded } };
}

/** The fields that define a Movement: name, kind, Rule, set count, loaded. */
const MovementFields = ({ draft, onChange }: { draft: MovementDraft; onChange: (d: MovementDraft) => void }) => {
    // A hold has no partial or assisted reps, so it cannot go past failure.
    const rules: Rule[] = draft.kind === "hold" ? ["failure", "noFailure"] : ["pastFailure", "failure", "noFailure"];
    return (
        <>
            <TextField label="Name" value={draft.name} onChange={name => onChange({ ...draft, name })} />
            <Toggle
                label="Kind"
                value={draft.kind}
                onChange={kind => onChange({ ...draft, kind, rule: kind === "hold" && draft.rule === "pastFailure" ? "failure" : draft.rule })}
                options={[{ value: "reps", label: "Reps" }, { value: "hold", label: "Hold" }]}
            />
            <Select
                label="Rule"
                value={draft.rule}
                onChange={rule => onChange({ ...draft, rule: rule as Rule })}
                options={rules.map(r => ({ value: r, label: RULE_LABEL[r] }))}
            />
            <Line label="Sets">
                <Stepper label="Sets" value={draft.sets} onChange={sets => onChange({ ...draft, sets })} less="One set less" more="One set more" focus={false} />
            </Line>
            <Toggle
                label="Load"
                value={draft.loaded ? "yes" : "no"}
                onChange={v => onChange({ ...draft, loaded: v === "yes" })}
                options={[{ value: "no", label: "No load" }, { value: "yes", label: "Loaded" }]}
            />
        </>
    );
};

// One Movement in one Workout. The top half edits the Movement record, which
// every Workout that uses it shares; the bottom half changes only this
// Workout's list.
const SlotPane = ({ workout, index, movement, data, onSave, onSlots, onError }: {
    workout: Workout;
    index: number;
    movement: Movement;
    data: Ready;
    onSave: (input: MovementInput) => void;
    /** Write the Workout's list; `then` is the row to select after it. */
    onSlots: (slots: Slot[], then?: string | null) => void;
    onError: (reason: string) => void;
}) => {
    const slot = workout.slots[index];
    const [draft, setDraft] = useState<MovementDraft>(draftOf(movement));
    const [replacement, setReplacement] = useState("");

    const sharedWith = data.plan.workouts.filter(w => w.key !== workout.key && w.slots.some(s => s.movementId === movement._id));
    const candidates = data.movements.filter(m => !workout.slots.some(s => s.movementId === m._id));
    const below = workout.slots[index + 1];
    const canPair = slot.pair != null || (below != null && below.pair == null);
    const above = workout.slots[index - 1];

    const save = (e: FormEvent) => {
        e.preventDefault();
        const { input, error: reason } = inputOf(draft);
        if (!input) { onError(reason ?? "Check the fields"); return; }
        onSave(input);
    };

    return (
        <>
            <PaneTitle name={movement.name} at={sharedWith.length > 0 ? `Also in ${sharedWith.map(w => w.name).join(", ")}` : undefined} />
            <form onSubmit={save} className="flex flex-col gap-3">
                <MovementFields draft={draft} onChange={setDraft} />
                <div><GlyphButton glyph={GLYPH.save} label="Save movement" type="submit" solid /></div>
            </form>

            <div className="border-t border-nier-150/40 pt-3 flex flex-col gap-3">
                <span className={EYEBROW}>In {workout.name}</span>
                <Line label="Pair">
                    <GlyphButton
                        glyph={slot.pair != null ? BRACKET.second : BRACKET.first}
                        label={slot.pair != null ? "Clear pair" : "Pair with next"}
                        pressed={slot.pair != null}
                        disabled={!canPair}
                        onClick={() => onSlots(togglePair(workout.slots, index))}
                    />
                </Line>
                {candidates.length > 0 && (
                    <Line label="Replace">
                        <Select
                            label="Replace with"
                            value={replacement}
                            onChange={setReplacement}
                            placeholder="Replace with…"
                            options={candidates.map(m => ({ value: m._id, label: m.name }))}
                        />
                        <GlyphButton
                            glyph={GLYPH.save}
                            label="Replace"
                            disabled={!replacement}
                            onClick={() => onSlots(replaceSlot(workout.slots, index, replacement), slotId(replacement))}
                        />
                    </Line>
                )}
                <Line label="Remove">
                    <GlyphButton
                        glyph={GLYPH.remove}
                        label={`Remove from ${workout.name}`}
                        onClick={() => onSlots(removeSlot(workout.slots, index), above ? slotId(above.movementId) : null)}
                    />
                </Line>
            </div>
        </>
    );
};

// The weekday of a Workout: seven days, the Workout's own inverted. A day
// that another Workout uses is dimmed and keeps its place (docs/chrome.md,
// "Dimmed"): two Workouts cannot share a day, and the dimmed day says whose it is.
const DayPane = ({ workout, workouts, onPick }: { workout: Workout; workouts: Workout[]; onPick: (weekday: number) => void }) => (
    <>
        <PaneTitle name={workout.name} at="Day" />
        <div role="group" aria-label={`${workout.name} weekday`} className="flex flex-wrap gap-1">
            {WEEKDAYS.map((name, i) => {
                const weekday = i + 1;
                const own = workout.weekday === weekday;
                const taken = workouts.find(w => w.key !== workout.key && w.weekday === weekday);
                return (
                    <button
                        key={name}
                        type="button"
                        aria-label={name}
                        aria-pressed={own}
                        title={taken ? `${name}: ${taken.name}` : name}
                        disabled={Boolean(taken)}
                        onClick={() => { if (!own) onPick(weekday); }}
                        className={`w-12 h-12 text-label uppercase tracking-widest border border-nier-dark cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default ${
                            own ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark hover:bg-nier-150/50"
                        }`}
                    >
                        {name.slice(0, 3)}
                    </button>
                );
            })}
        </div>
    </>
);

const AddPane = ({ workout, movements, onAdd, onError }: {
    workout: Workout;
    movements: Movement[];
    /** Adds the Movement whose id the callback gives; a new one is created first. */
    onAdd: (movementId: () => Promise<string>) => void;
    onError: (reason: string) => void;
}) => {
    const candidates = movements.filter(m => !workout.slots.some(s => s.movementId === m._id));
    const [existing, setExisting] = useState("");
    const [draft, setDraft] = useState<MovementDraft>(draftOf());

    const create = (e: FormEvent) => {
        e.preventDefault();
        const { input, error: reason } = inputOf(draft);
        if (!input) { onError(reason ?? "Check the fields"); return; }
        onAdd(async () => (await backend.addBodyMovement(input))._id);
    };

    return (
        <>
            <PaneTitle name={`Add to ${workout.name}`} />
            {candidates.length > 0 && (
                <>
                    <div className="flex items-center gap-3">
                        <Select
                            label="Existing movement"
                            value={existing}
                            onChange={setExisting}
                            placeholder="An existing movement…"
                            options={candidates.map(m => ({ value: m._id, label: m.name }))}
                        />
                        <GlyphButton glyph={GLYPH.save} label="Add" solid disabled={!existing} onClick={() => onAdd(async () => existing)} />
                    </div>
                    <span className={EYEBROW}>Or a new one</span>
                </>
            )}
            <form onSubmit={create} className="flex flex-col gap-3">
                <MovementFields draft={draft} onChange={setDraft} />
                <div><GlyphButton glyph={GLYPH.save} label="Create and add" type="submit" solid /></div>
            </form>
        </>
    );
};

/** One of the Stretches, or a new one when `item` is absent. */
const StretchPane = ({ item, onSave, onRemove, onError }: {
    item: RoutineItem | undefined;
    onSave: (item: RoutineItem) => void;
    onRemove: () => void;
    onError: (reason: string) => void;
}) => {
    const [name, setName] = useState(item?.name ?? "");
    const [sets, setSets] = useState(String(item?.sets ?? 2));
    const [unit, setUnit] = useState<"seconds" | "reps">(item?.reps != null ? "reps" : "seconds");
    const [amount, setAmount] = useState(String(item?.seconds ?? item?.reps ?? 30));

    const save = (e: FormEvent) => {
        e.preventDefault();
        const n = Number(sets.trim());
        const a = Number(amount.trim());
        if (!name.trim()) { onError("Enter a name"); return; }
        if (!Number.isInteger(n) || n < 1 || !Number.isInteger(a) || a < 1) { onError("Sets and the amount are whole numbers"); return; }
        onSave({ name: name.trim(), sets: n, [unit]: a } as RoutineItem);
    };

    return (
        <>
            <PaneTitle name={item ? item.name : "New stretch"} />
            <form onSubmit={save} className="flex flex-col gap-3">
                <TextField label="Name" value={name} onChange={setName} />
                <NumberField label="Sets" value={sets} onChange={setSets} />
                <Toggle
                    label="Unit"
                    value={unit}
                    onChange={setUnit}
                    options={[{ value: "seconds", label: "Seconds" }, { value: "reps", label: "Reps" }]}
                />
                <NumberField label={unit === "seconds" ? "Seconds" : "Reps"} value={amount} onChange={setAmount} />
                <div className="flex items-center gap-3">
                    <GlyphButton glyph={GLYPH.save} label="Save stretch" type="submit" solid />
                    {item && <GlyphButton glyph={GLYPH.remove} label="Remove stretch" onClick={onRemove} className="ml-auto" />}
                </div>
            </form>
        </>
    );
};

const PhasePane = ({ phase, onSave, onError }: { phase: Phase; onSave: (phase: Phase) => void; onError: (reason: string) => void }) => {
    const [name, setName] = useState(phase.name);
    const [start, setStart] = useState(String(phase.startLb));
    const [target, setTarget] = useState(String(phase.targetLb));

    const save = (e: FormEvent) => {
        e.preventDefault();
        const startLb = Number(start.trim());
        const targetLb = Number(target.trim());
        if (!name.trim() || !Number.isFinite(startLb) || !Number.isFinite(targetLb) || startLb <= 0 || targetLb <= 0) {
            onError("Enter a name and two weights in pounds");
            return;
        }
        onSave({ name: name.trim(), startLb, targetLb });
    };

    return (
        <>
            <PaneTitle name="Phase" />
            <form onSubmit={save} data-testid="plan-list-phase" className="flex flex-col gap-3">
                <TextField label="Name" value={name} onChange={setName} />
                <NumberField label="Start lb" value={start} onChange={setStart} decimal />
                <NumberField label="Target lb" value={target} onChange={setTarget} decimal />
                <div><GlyphButton glyph={GLYPH.save} label="Save phase" type="submit" solid /></div>
            </form>
        </>
    );
};

/** A Movement that is in no Workout: its fields, and the control that deletes it. */
const UnusedPane = ({ movement, onSave, onDelete, onError }: {
    movement: Movement;
    onSave: (input: MovementInput) => void;
    onDelete: () => void;
    onError: (reason: string) => void;
}) => {
    const [draft, setDraft] = useState<MovementDraft>(draftOf(movement));

    const save = (e: FormEvent) => {
        e.preventDefault();
        const { input, error: reason } = inputOf(draft);
        if (!input) { onError(reason ?? "Check the fields"); return; }
        onSave(input);
    };

    return (
        <>
            <PaneTitle name={movement.name} />
            <form onSubmit={save} className="flex flex-col gap-3">
                <MovementFields draft={draft} onChange={setDraft} />
                <div className="flex items-center gap-3">
                    <GlyphButton glyph={GLYPH.save} label="Save movement" type="submit" solid />
                    <GlyphButton glyph={GLYPH.remove} label={`Delete ${movement.name}`} onClick={onDelete} className="ml-auto" />
                </div>
            </form>
        </>
    );
};

export default PlanTab;
