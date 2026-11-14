import { useState } from "react";
import type { FormEvent } from "react";
import { backend } from "../../../../api/backend";
import { TextField } from "../../../../components/common/TextField";
import { DragHandle, SortableList } from "../../../../components/common/Sortable";
import { useSortableRow } from "../../../../hooks/useSortableRow";
import { useRetained } from "../../../../hooks/useRetained";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import { EditorModal, ErrorLine, primaryBtn, secondaryBtn, smallBtn } from "../Finances/ui";
import { errorText } from "../Finances/errorText";
import { NumberField, Select, Toggle } from "./fields";
import { GLYPH, RULE_GLYPH } from "./glyphs";
import { AddRow, Chip, GlyphButton } from "./marks";
import { addSlot, afterMove, nextWorkout, pairEdge, removeSlot, replaceSlot, togglePair } from "./plan";
import { RULE_LABEL, WEEKDAYS, describeRoutineItem } from "./text";
import type { Ready } from "./TodayTab";
import type { Movement, MovementInput, MovementKind, Phase, RoutineItem, Rule, Slot, Workout, WorkoutKey } from "../../../../types/body";

type Props = { data: Ready; onChanged: () => Promise<void> | void };

// Which editor is open. One at a time, so modals never stack.
type Editing =
    | { kind: "slot"; workout: Workout; index: number }
    | { kind: "add"; workout: Workout }
    | { kind: "routine"; index: number | null }
    | null;

// What the Plan view can show. One at a time (body-ui R18): seven lists with
// the same shape, stacked, were a long scroll for a view opened to change one.
type Shown = WorkoutKey | "routine" | "phase" | "unused";

// Every edit to the Plan happens here (body-plan R10), away from the screen
// used each day. A Workout's Movements, their order and their Pairs are one
// list, and each change writes that whole list.
const PlanTab = ({ data, onChanged }: Props) => {
    const { plan, movements, summary } = data;
    const [editing, setEditing] = useState<Editing>(null);
    // Bumped on each open, so an editor remounts with fresh fields.
    const [openCount, setOpenCount] = useState(0);
    const [error, setError] = useState("");

    const open = (next: NonNullable<Editing>) => { setOpenCount(n => n + 1); setEditing(next); };
    const close = () => setEditing(null);

    const shownSlot = useRetained(editing?.kind === "slot" ? editing : null);
    const shownAdd = useRetained(editing?.kind === "add" ? editing : null);
    const shownRoutine = useRetained(editing?.kind === "routine" ? editing : null);

    const run = async (action: () => Promise<unknown>) => {
        setError("");
        try {
            await action();
            await onChanged();
            return true;
        } catch (e) {
            setError(errorText(e));
            return false;
        }
    };

    const inPlan = new Set(plan.workouts.flatMap(w => w.slots.map(s => s.movementId)));
    const unused = movements.filter(m => !inPlan.has(m._id));
    const byWeekday = [...plan.workouts].sort((a, b) => a.weekday - b.weekday);

    // Opens on the Workout that is due next: the one most likely to be changed.
    const [picked, setPicked] = useState<Shown | null>(null);
    const fallback: Shown = nextWorkout(plan.workouts, summary.today.weekday, summary.today.dueDone)?.key ?? "routine";
    // The last unused Movement can be deleted while its list is open.
    const shown: Shown = picked === "unused" && unused.length === 0 ? fallback : picked ?? fallback;
    const workout = plan.workouts.find(w => w.key === shown) ?? null;

    const entries: { id: Shown; label: string }[] = [
        ...byWeekday.map(w => ({ id: w.key as Shown, label: w.name })),
        { id: "routine", label: "Routine" },
        { id: "phase", label: "Phase" },
        ...(unused.length > 0 ? [{ id: "unused" as Shown, label: "Unused" }] : []),
    ];

    return (
        <div className="flex flex-col gap-4">
            <ShadowBox as="section" label="Plan" className="bg-nier-100-lighter border border-nier-150">
                <ToolbarRow>
                    {entries.map(e => (
                        <Chip key={e.id} testId={`plan-${e.id}`} active={shown === e.id} onClick={() => setPicked(e.id)}>{e.label}</Chip>
                    ))}
                </ToolbarRow>

                {workout && (
                    <WorkoutList
                        key={workout.key}
                        workout={workout}
                        movements={movements}
                        onWeekday={weekday => run(() => backend.updateBodyWorkout(workout.key, { weekday }))}
                        onMove={(from, to) => run(() => backend.updateBodyWorkout(workout.key, { slots: afterMove(workout.slots, from, to) }))}
                        onOpenSlot={index => open({ kind: "slot", workout, index })}
                        onAdd={() => open({ kind: "add", workout })}
                    />
                )}

                {shown === "routine" && (
                    <div data-testid="plan-list-routine">
                        <AddRow label="New item" onClick={() => open({ kind: "routine", index: null })} first />
                        {plan.routine.items.map((item, i) => (
                            <button
                                key={`${item.name}-${i}`}
                                onClick={() => open({ kind: "routine", index: i })}
                                className="w-full flex items-center justify-between gap-3 px-3 min-h-11 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                            >
                                <span className="text-label text-nier-text-dark truncate">{item.name}</span>
                                <span className="text-label text-nier-text-dark/60 shrink-0 tabular-nums">{describeRoutineItem(item)}</span>
                            </button>
                        ))}
                    </div>
                )}

                {shown === "phase" && (
                    <PhaseForm key={`${plan.phase.name}:${plan.phase.startLb}:${plan.phase.targetLb}`} phase={plan.phase} onSave={phase => run(() => backend.updateBodyPhase(phase))} />
                )}

                {shown === "unused" && unused.map(m => (
                    <div key={m._id} data-testid={`unused-${m.name}`} className="flex items-center justify-between gap-3 pl-3 border-b border-nier-150/30 last:border-0">
                        <span className="text-label text-nier-text-dark/70 truncate">{m.name}</span>
                        {/* A Movement with Sets is history; the server refuses to delete it (body-plan D15). */}
                        <GlyphButton glyph={GLYPH.remove} label={`Delete ${m.name}`} onClick={() => run(() => backend.removeBodyMovement(m._id))} className="border-0 w-11 h-11" />
                    </div>
                ))}

                {error && <div className="px-3 py-2"><ErrorLine error={error} /></div>}
            </ShadowBox>

            {shownSlot && (
                <SlotModal
                    key={`slot-${openCount}`}
                    open={editing?.kind === "slot"}
                    workout={shownSlot.workout}
                    index={shownSlot.index}
                    data={data}
                    onClose={close}
                    onChanged={onChanged}
                />
            )}
            {shownAdd && (
                <AddSlotModal
                    key={`add-${openCount}`}
                    open={editing?.kind === "add"}
                    workout={shownAdd.workout}
                    movements={movements}
                    onClose={close}
                    onChanged={onChanged}
                />
            )}
            {shownRoutine && (
                <RoutineModal
                    key={`routine-${openCount}`}
                    open={editing?.kind === "routine"}
                    items={plan.routine.items}
                    index={shownRoutine.index}
                    onClose={close}
                    onChanged={onChanged}
                />
            )}
        </div>
    );
};

const WorkoutList = ({ workout, movements, onWeekday, onMove, onOpenSlot, onAdd }: {
    workout: Workout;
    movements: Movement[];
    onWeekday: (weekday: number) => void;
    onMove: (from: number, to: number) => void;
    onOpenSlot: (index: number) => void;
    onAdd: () => void;
}) => {
    const byId = new Map(movements.map(m => [m._id, m]));
    return (
        <div data-testid={`workout-${workout.key}`}>
            {/* The weekday changes the Plan, so it sits with the Workout it moves, not in the toolbar. */}
            <div className="px-3 py-3 border-b border-nier-150/30 sm:w-64">
                <Select
                    label={`${workout.name} weekday`}
                    value={String(workout.weekday)}
                    onChange={v => onWeekday(Number(v))}
                    options={WEEKDAYS.map((name, i) => ({ value: String(i + 1), label: name }))}
                />
            </div>
            <SortableList onMove={onMove}>
                {workout.slots.map((slot, i) => {
                    const movement = byId.get(slot.movementId);
                    if (!movement) return null;
                    return <SlotRow key={slot.movementId} edge={pairEdge(workout.slots, i)} movement={movement} index={i} onOpen={() => onOpenSlot(i)} />;
                })}
            </SortableList>
            <AddRow label="Add movement" onClick={onAdd} />
        </div>
    );
};

// The two rows of a Pair end in the two halves of one bracket.
const BRACKET = { first: "┐", second: "┘" } as const;

const SlotRow = ({ edge, movement, index, onOpen }: { edge: "first" | "second" | null; movement: Movement; index: number; onOpen: () => void }) => {
    const { ref, handleRef, isDragging } = useSortableRow(movement._id, index);
    return (
        <div
            ref={ref}
            onClick={onOpen}
            data-testid={`slot-${movement.name}`}
            data-pair={edge ?? undefined}
            className={`flex items-center gap-1 border-b border-nier-150/30 hover:bg-nier-150/30 cursor-pointer transition-colors ${isDragging ? "bg-nier-150/50" : ""}`}
        >
            <DragHandle handleRef={handleRef} label={`Reorder ${movement.name}`} className="text-nier-text-dark/50" />
            <span className="flex-1 min-w-0 text-label text-nier-text-dark truncate">{movement.name}</span>
            <span title={RULE_LABEL[movement.rule]} className="text-label text-nier-text-dark/70 shrink-0 tabular-nums">
                {movement.sets} × {RULE_GLYPH[movement.rule]}
            </span>
            <span aria-label={edge ? "Pair" : undefined} className="w-6 shrink-0 text-body text-nier-text-dark/50 leading-none">{edge ? BRACKET[edge] : ""}</span>
        </div>
    );
};

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
            <NumberField label="Sets" value={draft.sets} onChange={sets => onChange({ ...draft, sets })} />
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
const SlotModal = ({ open, workout, index, data, onClose, onChanged }: {
    open: boolean;
    workout: Workout;
    index: number;
    data: Ready;
    onClose: () => void;
    onChanged: () => Promise<void> | void;
}) => {
    const slot = workout.slots[index];
    const movement = data.movements.find(m => m._id === slot?.movementId);
    const [draft, setDraft] = useState<MovementDraft>(draftOf(movement));
    const [replacement, setReplacement] = useState("");
    const [error, setError] = useState("");

    if (!slot || !movement) return null;

    const sharedWith = data.plan.workouts.filter(w => w.key !== workout.key && w.slots.some(s => s.movementId === movement._id));
    const candidates = data.movements.filter(m => !workout.slots.some(s => s.movementId === m._id));
    const below = workout.slots[index + 1];
    const canPair = slot.pair != null || (below != null && below.pair == null);

    const run = async (action: () => Promise<unknown>) => {
        setError("");
        try {
            await action();
            await onChanged();
            onClose();
        } catch (e) { setError(errorText(e)); }
    };

    const save = () => {
        const { input, error: reason } = inputOf(draft);
        if (!input) { setError(reason ?? "Check the fields"); return; }
        run(() => backend.updateBodyMovement(movement._id, input));
    };
    const writeSlots = (slots: Slot[]) => run(() => backend.updateBodyWorkout(workout.key, { slots }));

    return (
        <EditorModal open={open} title={movement.name} onClose={onClose}>
            <MovementFields draft={draft} onChange={setDraft} />
            {sharedWith.length > 0 && (
                <p className="text-label text-nier-text-dark/60">
                    Also in {sharedWith.map(w => w.name).join(", ")}. These fields change it there too.
                </p>
            )}
            <button onClick={save} className={primaryBtn}>Save</button>

            <div className="border-t border-nier-150/40 pt-4 flex flex-col gap-3">
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">In {workout.name}</span>
                {candidates.length > 0 && (
                    <div className="flex gap-2">
                        <Select
                            label="Replace with"
                            value={replacement}
                            onChange={setReplacement}
                            placeholder="Replace with…"
                            options={candidates.map(m => ({ value: m._id, label: m.name }))}
                        />
                        <button onClick={() => replacement && writeSlots(replaceSlot(workout.slots, index, replacement))} disabled={!replacement} className={secondaryBtn}>
                            Replace
                        </button>
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => writeSlots(togglePair(workout.slots, index))} disabled={!canPair} className={smallBtn}>
                        {slot.pair != null ? "Clear pair" : "Pair with next"}
                    </button>
                    <button onClick={() => writeSlots(removeSlot(workout.slots, index))} className={smallBtn}>
                        Remove from {workout.name}
                    </button>
                </div>
            </div>
            <ErrorLine error={error} />
        </EditorModal>
    );
};

const AddSlotModal = ({ open, workout, movements, onClose, onChanged }: {
    open: boolean;
    workout: Workout;
    movements: Movement[];
    onClose: () => void;
    onChanged: () => Promise<void> | void;
}) => {
    const candidates = movements.filter(m => !workout.slots.some(s => s.movementId === m._id));
    const [existing, setExisting] = useState("");
    const [draft, setDraft] = useState<MovementDraft>(draftOf());
    const [error, setError] = useState("");

    const add = async (movementId: () => Promise<string>) => {
        setError("");
        try {
            await backend.updateBodyWorkout(workout.key, { slots: addSlot(workout.slots, await movementId()) });
            await onChanged();
            onClose();
        } catch (e) { setError(errorText(e)); }
    };

    const create = () => {
        const { input, error: reason } = inputOf(draft);
        if (!input) { setError(reason ?? "Check the fields"); return; }
        add(async () => (await backend.addBodyMovement(input))._id);
    };

    return (
        <EditorModal open={open} title={`Add to ${workout.name}`} onClose={onClose}>
            {candidates.length > 0 && (
                <>
                    <div className="flex gap-2">
                        <Select
                            label="Existing movement"
                            value={existing}
                            onChange={setExisting}
                            placeholder="An existing movement…"
                            options={candidates.map(m => ({ value: m._id, label: m.name }))}
                        />
                        <button onClick={() => existing && add(async () => existing)} disabled={!existing} className={secondaryBtn}>Add</button>
                    </div>
                    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">Or a new one</span>
                </>
            )}
            <MovementFields draft={draft} onChange={setDraft} />
            <button onClick={create} className={primaryBtn}>Create and add</button>
            <ErrorLine error={error} />
        </EditorModal>
    );
};

const RoutineModal = ({ open, items, index, onClose, onChanged }: {
    open: boolean;
    items: RoutineItem[];
    /** The item being edited, or null for a new one. */
    index: number | null;
    onClose: () => void;
    onChanged: () => Promise<void> | void;
}) => {
    const item = index != null ? items[index] : undefined;
    const [name, setName] = useState(item?.name ?? "");
    const [sets, setSets] = useState(String(item?.sets ?? 2));
    const [unit, setUnit] = useState<"seconds" | "reps">(item?.reps != null ? "reps" : "seconds");
    const [amount, setAmount] = useState(String(item?.seconds ?? item?.reps ?? 30));
    const [error, setError] = useState("");

    const write = async (next: RoutineItem[]) => {
        setError("");
        try {
            await backend.updateBodyRoutine(next);
            await onChanged();
            onClose();
        } catch (e) { setError(errorText(e)); }
    };

    const save = () => {
        const n = Number(sets.trim());
        const a = Number(amount.trim());
        if (!name.trim()) { setError("Enter a name"); return; }
        if (!Number.isInteger(n) || n < 1 || !Number.isInteger(a) || a < 1) { setError("Sets and the amount are whole numbers"); return; }
        const next: RoutineItem = { name: name.trim(), sets: n, [unit]: a };
        write(index != null ? items.map((it, i) => (i === index ? next : it)) : [...items, next]);
    };

    return (
        <EditorModal open={open} title={item ? item.name : "New routine item"} onClose={onClose}>
            <TextField label="Name" value={name} onChange={setName} />
            <NumberField label="Sets" value={sets} onChange={setSets} />
            <Toggle
                label="Unit"
                value={unit}
                onChange={setUnit}
                options={[{ value: "seconds", label: "Seconds" }, { value: "reps", label: "Reps" }]}
            />
            <NumberField label={unit === "seconds" ? "Seconds" : "Reps"} value={amount} onChange={setAmount} />
            <div className="flex gap-2">
                <button onClick={save} className={primaryBtn}>Save</button>
                {index != null && (
                    <button onClick={() => write(items.filter((_, i) => i !== index))} className={secondaryBtn}>Remove</button>
                )}
            </div>
            <ErrorLine error={error} />
        </EditorModal>
    );
};

const PhaseForm = ({ phase, onSave }: { phase: Phase; onSave: (phase: Phase) => Promise<boolean> }) => {
    const [name, setName] = useState(phase.name);
    const [start, setStart] = useState(String(phase.startLb));
    const [target, setTarget] = useState(String(phase.targetLb));
    const [error, setError] = useState("");

    const save = (e: FormEvent) => {
        e.preventDefault();
        const startLb = Number(start.trim());
        const targetLb = Number(target.trim());
        if (!name.trim() || !Number.isFinite(startLb) || !Number.isFinite(targetLb) || startLb <= 0 || targetLb <= 0) {
            setError("Enter a name and two weights in pounds");
            return;
        }
        setError("");
        onSave({ name: name.trim(), startLb, targetLb });
    };

    return (
        <form onSubmit={save} data-testid="plan-list-phase" className="p-3 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3">
                <TextField label="Name" value={name} onChange={setName} />
                <NumberField label="Start lb" value={start} onChange={setStart} decimal />
                <NumberField label="Target lb" value={target} onChange={setTarget} decimal />
                <GlyphButton glyph={GLYPH.next} label="Save phase" type="submit" solid />
            </div>
            <ErrorLine error={error} />
        </form>
    );
};

export default PlanTab;
