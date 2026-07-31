import { useState } from "react";
import { NumTextField } from "../../../../components/common/NumTextField";
import { DateField } from "../../../../components/common/DateField";
import { backend } from "../../../../api/backend";
import { atLocalMidnight, describeGoal, fieldValue, todayValue } from "./entry";
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
// common case.
const LogBar = ({ movement, lastEntry, onSaved }: Props) => {
    // Seeded once per mount. The caller keys this component on the Movement
    // and the most recent Entry, so a new selection or a fresh save remounts
    // it with new values. Re-seeding from an effect instead would clobber
    // anything typed before that effect got a chance to run.
    const [sets, setSets]       = useState(fieldValue(lastEntry?.setsCompleted));
    const [reps, setReps]       = useState(fieldValue(lastEntry?.repsCompleted));
    const [weight, setWeight]   = useState(fieldValue(lastEntry?.weightUsed));
    const [date, setDate]       = useState(todayValue());
    const [dateOpen, setDateOpen] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState("");
    const [notesOpen, setNotesOpen] = useState(false);

    const goalText = describeGoal(movement.goal);

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
                datetime: atLocalMidnight(date),
            });
            // Back to today so the next log never silently inherits a backdate.
            setDate(todayValue());
            setDateOpen(false);
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

            {/* Movement, goal, date */}
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

                {dateOpen ? (
                    <div className="flex items-center gap-2">
                        <div className="w-44"><DateField label="Date" value={date} onChange={setDate} /></div>
                        <button
                            onClick={() => { setDate(todayValue()); setDateOpen(false); }}
                            aria-label="Clear date"
                            className="text-sm px-2 min-h-11 cursor-pointer text-nier-text-dark/60 hover:text-nier-text-dark"
                        >✕</button>
                    </div>
                ) : (
                    <button
                        onClick={() => setDateOpen(true)}
                        className="text-[10px] uppercase tracking-widest px-3 py-1.5 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors"
                    >
                        Today
                    </button>
                )}
            </div>

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
