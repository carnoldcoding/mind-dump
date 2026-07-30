import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { TextField } from "../../../../components/common/TextField";
import { BigTextField } from "../../../../components/common/BigTextField";
import { NumTextField } from "../../../../components/common/NumTextField";
import { Button } from "../../../../components/common/Button";
import { backend } from "../../../../api/backend";
import { enterClass } from "../../../../utils/animations";
import type { Goal, Movement } from "./entry";

type Props = {
    movement: Movement;
    onClose: () => void;
    onSaved: () => void;
    onDelete: (workoutName: string) => void;
};

const str = (n: number | null | undefined) => (n != null ? String(n) : "");
const num = (s: string) => (s.trim() === "" ? null : Number(s));

// Everything that defines a Movement is edited here, Goal included. A Goal is
// current state, not history — saving replaces whatever was there before.
const MovementEditModal = ({ movement, onClose, onSaved, onDelete }: Props) => {
    const confirmId = useId();
    const [displayName, setDisplayName] = useState(movement.displayName);
    const [tag, setTag]                 = useState<"upper" | "lower" | null>(movement.tag);
    const [notes, setNotes]             = useState(movement.notes);
    const [setGoal, setSetGoal]         = useState(str(movement.goal?.sets));
    const [repGoal, setRepGoal]         = useState(str(movement.goal?.reps));
    const [weightGoal, setWeightGoal]   = useState(str(movement.goal?.weight));
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState("");
    const [deleteStage, setDeleteStage] = useState<"idle" | "confirm">("idle");
    const [deleteInput, setDeleteInput] = useState("");
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        if (!displayName.trim()) { setError("Name is required"); return; }
        setSaving(true);
        setError("");

        const goal: Goal = { sets: num(setGoal), reps: num(repGoal), weight: num(weightGoal) };
        const isEmpty = goal.sets == null && goal.reps == null && goal.weight == null;

        try {
            const payload = {
                displayName: displayName.trim(),
                tag,
                notes,
                goal: isEmpty ? null : goal,
            };
            if (movement.id) {
                await backend.updateBodyEntry({ id: movement.id, ...payload });
            } else {
                await backend.addBodyEntry({
                    workoutName: movement.workoutName,
                    _meta: true,
                    order: movement.order,
                    datetime: new Date().toISOString(),
                    ...payload,
                });
            }
            onSaved();
            onClose();
        } catch {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 ${enterClass('nier-backdrop-enter')}`}>
            <div role="dialog" aria-label="Edit Movement" className={`relative w-full max-w-md ${enterClass('nier-modal-enter')}`}>
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative max-h-[85vh] overflow-y-auto">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5 sticky top-0">
                        <span className="text-nier-text-dark text-xl uppercase tracking-wide">Edit Movement</span>
                        <button onClick={onClose} aria-label="Close" className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">×</button>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <TextField label="Name" value={displayName} onChange={setDisplayName} altBg />

                        {/* Tag toggle */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">Type</span>
                            <div className="flex gap-2">
                                {(["upper", "lower"] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTag(tag === t ? null : t)}
                                        className={`text-xs uppercase tracking-wide px-4 min-h-11 border border-nier-dark cursor-pointer transition-colors ${
                                            tag === t
                                                ? "bg-nier-text-dark text-nier-100-lighter"
                                                : "text-nier-text-dark hover:bg-nier-150/50"
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">Goal</span>
                            <div className="flex gap-3">
                                <NumTextField label="Set Goal"    value={setGoal}    onChange={setSetGoal} />
                                <NumTextField label="Rep Goal"    value={repGoal}    onChange={setRepGoal} />
                                <NumTextField label="Weight Goal" value={weightGoal} onChange={setWeightGoal} />
                            </div>
                        </div>

                        <BigTextField label="Notes" value={notes} onChange={setNotes} />

                        {error && <p className="text-red-800 text-sm">{error}</p>}

                        {deleteStage === "confirm" ? (
                            <div className="flex flex-col gap-2 border-t border-nier-150 pt-3">
                                <label htmlFor={confirmId} className="text-xs text-nier-text-dark/60">
                                    Type the name <span className="italic">{movement.displayName}</span> to confirm deletion. This removes the movement and everything logged against it.
                                </label>
                                <input
                                    id={confirmId}
                                    autoFocus
                                    className="border border-nier-150 px-3 py-2 text-sm bg-nier-100-lighter focus:outline-none focus:border-nier-dark"
                                    value={deleteInput}
                                    onChange={e => { setDeleteInput(e.target.value); setDeleteError(""); }}
                                />
                                {deleteError && <p className="text-red-800 text-xs">{deleteError}</p>}
                                <div className="flex gap-2 justify-end">
                                    <Button type="secondary" label="Cancel" handleClick={() => { setDeleteStage("idle"); setDeleteInput(""); }} />
                                    <Button type="primary"   label="Confirm Delete" handleClick={() => {
                                        if (deleteInput !== movement.displayName) { setDeleteError("Name doesn't match"); return; }
                                        onDelete(movement.workoutName);
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between gap-2 pt-1">
                                <Button type="secondary" label="Delete" handleClick={() => setDeleteStage("confirm")} />
                                <div className="flex gap-2">
                                    <Button type="secondary" label="Cancel"                       handleClick={onClose} />
                                    <Button type="primary"   label={saving ? "Saving…" : "Save"} handleClick={handleSave} />
                                </div>
                            </div>
                        )}
                    </div>
                </article>
            </div>
        </div>,
        document.body
    );
};

export default MovementEditModal;
