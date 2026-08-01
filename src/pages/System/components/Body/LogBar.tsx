import { useState } from "react";
import { NumTextField } from "../../../../components/common/NumTextField";
import { backend } from "../../../../api/backend";
import { atLocalMidnight, buildGoal, describeGoal, fieldValue, todayValue } from "./entry";
import type { Entry, Movement } from "./entry";

type Props = {
    movement: Movement;
    lastEntry: Entry | null;
    onSaved: () => void;
};

const numOrUndefined = (value: string) => (value.trim() === "" ? undefined : Number(value));

// Logging is the thing this window exists for, so it isn't behind a button.
// The fields sit where the Movement is, pre-filled with whatever was done
// last time, because "same as last session, maybe a bit more" is the honest
// common case. An Entry is always logged against today; a set logged on the
// wrong day gets its date fixed in EntryEditModal afterwards, which is rarer
// than logging and doesn't deserve room next to the thing you came to do.
const LogBar = ({ movement, lastEntry, onSaved }: Props) => {
    // Seeded once per mount. The caller keys this component on the Movement
    // and the most recent Entry, so a new selection or a fresh save remounts
    // it with new values. Re-seeding from an effect instead would clobber
    // anything typed before that effect got a chance to run.
    const [sets, setSets]       = useState(fieldValue(lastEntry?.setsCompleted));
    const [reps, setReps]       = useState(fieldValue(lastEntry?.repsCompleted));
    const [weight, setWeight]   = useState(fieldValue(lastEntry?.weightUsed));
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState("");
    const [notesOpen, setNotesOpen] = useState(false);

    // Goal editing lives here, next to the Goal it changes, because the chart
    // draws a target line you have no other way to move without going through
    // the Movement modal. Seeded on open rather than on mount so it always
    // reflects the Goal currently in props.
    const [goalOpen, setGoalOpen]     = useState(false);
    const [setGoalV, setSetGoalV]     = useState("");
    const [repGoalV, setRepGoalV]     = useState("");
    const [weightGoalV, setWeightGoalV] = useState("");
    const [goalSaving, setGoalSaving] = useState(false);
    const [goalError, setGoalError]   = useState("");

    const goalText = describeGoal(movement.goal);

    const openGoal = () => {
        setSetGoalV(fieldValue(movement.goal?.sets));
        setRepGoalV(fieldValue(movement.goal?.reps));
        setWeightGoalV(fieldValue(movement.goal?.weight));
        setGoalError("");
        setGoalOpen(true);
    };

    const handleSaveGoal = async () => {
        if (!movement.id) { setGoalError("Movement not saved yet"); return; }
        setGoalSaving(true);
        setGoalError("");
        try {
            // A Goal is current state, so this replaces whatever was there —
            // clearing all three fields removes it (ADR-0002).
            await backend.updateBodyEntry({
                id: movement.id,
                goal: buildGoal(setGoalV, repGoalV, weightGoalV),
            });
            setGoalOpen(false);
            onSaved();
        } catch {
            setGoalError("Network error");
        } finally {
            setGoalSaving(false);
        }
    };

    const handleLog = async () => {
        const setsCompleted = numOrUndefined(sets);
        const repsCompleted = numOrUndefined(reps);
        const weightUsed    = numOrUndefined(weight);

        if (setsCompleted == null && repsCompleted == null && weightUsed == null) {
            setError("Enter at least one value");
            return;
        }

        setSaving(true);
        setError("");
        try {
            await backend.addBodyEntry({
                workoutName: movement.workoutName,
                ...(setsCompleted != null && { setsCompleted }),
                ...(repsCompleted != null && { repsCompleted }),
                ...(weightUsed != null && { weightUsed }),
                datetime: atLocalMidnight(todayValue()),
            });
            onSaved();
        } catch {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section aria-label="Log" className="bg-nier-100-lighter border border-nier-150 relative">
            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />

            {/* Movement and goal */}
            <div className="min-h-7 bg-nier-150 flex flex-wrap items-center justify-between gap-2 px-3 py-1">
                <div className="flex items-baseline gap-3 min-w-0">
                    <span className="text-nier-text-dark text-sm uppercase tracking-wide truncate">
                        {movement.displayName}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-nier-text-dark/60 shrink-0">Goal</span>
                    <span className="text-xs text-nier-text-dark/80 shrink-0">
                        {goalText ?? "No goal set"}
                    </span>
                </div>

                <button
                    onClick={() => (goalOpen ? setGoalOpen(false) : openGoal())}
                    aria-expanded={goalOpen}
                    className="text-[10px] uppercase tracking-widest px-3 py-1.5 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors"
                >
                    {goalOpen ? "Cancel" : goalText ? "Edit Goal" : "Set Goal"}
                </button>
            </div>

            {/* Goal editor — sits above the log fields so the target you're
                aiming at is set before the numbers you hit against it. */}
            {goalOpen && (
                <div className="p-3 pb-0 flex flex-col gap-2">
                    <div className="flex items-end gap-2 sm:gap-3">
                        <NumTextField label="Set Goal"    value={setGoalV}    onChange={setSetGoalV} />
                        <NumTextField label="Rep Goal"    value={repGoalV}    onChange={setRepGoalV} />
                        <NumTextField label="Weight Goal" value={weightGoalV} onChange={setWeightGoalV} />
                        <button
                            onClick={handleSaveGoal}
                            disabled={goalSaving}
                            className="shrink-0 uppercase tracking-wide text-sm px-5 h-12 border border-nier-dark text-nier-text-dark cursor-pointer hover:bg-nier-150/50 disabled:opacity-50"
                        >
                            {goalSaving ? "…" : "Save"}
                        </button>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-nier-text-dark/40">
                        Clear all three to remove the goal
                    </p>
                    {goalError && <p className="text-red-800 text-xs">{goalError}</p>}
                </div>
            )}

            {/* Fields */}
            <div className="p-3 flex items-end gap-2 sm:gap-3">
                <NumTextField label="Sets"   value={sets}   onChange={setSets} />
                <NumTextField label="Reps"   value={reps}   onChange={setReps} />
                <NumTextField label="Weight" value={weight} onChange={setWeight} />
                <button
                    onClick={handleLog}
                    disabled={saving}
                    className="shrink-0 uppercase tracking-wide text-sm px-5 h-12 border border-nier-dark bg-nier-text-dark text-nier-100-lighter cursor-pointer hover:bg-nier-text-dark/90 disabled:opacity-50"
                >
                    {saving ? "…" : "Log"}
                </button>
            </div>

            {error && <p className="text-red-800 text-xs px-3 pb-2">{error}</p>}

            {/* Notes — read while filling the fields in, not a tab away */}
            {movement.notes && (
                <button
                    onClick={() => setNotesOpen(o => !o)}
                    aria-expanded={notesOpen}
                    className="w-full text-left px-3 py-2 border-t border-nier-150/40 cursor-pointer hover:bg-nier-150/20 transition-colors"
                >
                    <span className={`text-xs text-nier-text-dark/70 whitespace-pre-wrap ${notesOpen ? "" : "line-clamp-1"}`}>
                        {movement.notes}
                    </span>
                </button>
            )}
        </section>
    );
};

export default LogBar;
