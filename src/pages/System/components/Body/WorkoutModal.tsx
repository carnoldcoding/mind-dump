import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TextField } from "../../../../components/common/TextField";
import { NumTextField } from "../../../../components/common/NumTextField";
import { DateField } from "../../../../components/common/DateField";
import { Button } from "../../../../components/common/Button";
import { backend } from "../../../../api/backend";

export type ModalMode = "create" | "goals" | "log";

type LastEntry = {
    weightUsed?: number;
    repsCompleted?: number;
    setsCompleted?: number;
};

type Props = {
    mode: ModalMode;
    movement?: string;
    lastEntry?: LastEntry;
    onClose: () => void;
    onSaved: () => void;
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TITLES: Record<ModalMode, string> = {
    create: "New Movement",
    goals:  "Set Goals",
    log:    "Log Workout",
};

const WorkoutModal = ({ mode, movement, lastEntry, onClose, onSaved }: Props) => {
    const [name, setName]                 = useState("");
    const [date, setDate]                 = useState(todayStr());
    const [setGoal, setSetGoal]           = useState(lastEntry?.setsCompleted != null ? String(lastEntry.setsCompleted) : "");
    const [repGoal, setRepGoal]           = useState(lastEntry?.repsCompleted != null ? String(lastEntry.repsCompleted) : "");
    const [weightGoal, setWeightGoal]     = useState(lastEntry?.weightUsed    != null ? String(lastEntry.weightUsed)    : "");
    const [weightUsed, setWeightUsed]     = useState(lastEntry?.weightUsed != null ? String(lastEntry.weightUsed) : "");
    const [repsCompleted, setRepsCompleted] = useState(lastEntry?.repsCompleted != null ? String(lastEntry.repsCompleted) : "");
    const [setsCompleted, setSetsCompleted] = useState(lastEntry?.setsCompleted != null ? String(lastEntry.setsCompleted) : "");
    const [createTag, setCreateTag]       = useState<"upper" | "lower" | null>(null);
    const [saving, setSaving]             = useState(false);
    const [error, setError]               = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        const workoutName = mode === "create" ? name.trim() : movement?.trim();
        if (!workoutName) { setError("Movement name is required"); return; }

        setSaving(true);
        setError("");

        const payload: Record<string, any> = {
            workoutName,
            datetime: (() => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d).toISOString(); })(),
        };

        if (mode === "goals") {
            if (weightGoal) payload.weightGoal = Number(weightGoal);
            if (repGoal)    payload.repGoal    = Number(repGoal);
            if (setGoal)    payload.setGoal    = Number(setGoal);
        }

        if (mode === "log") {
            if (weightUsed)    payload.weightUsed    = Number(weightUsed);
            if (repsCompleted) payload.repsCompleted = Number(repsCompleted);
            if (setsCompleted) payload.setsCompleted = Number(setsCompleted);
        }

        try {
            await backend.addBodyEntry(payload);

            // Seed a meta entry so the movement is immediately configurable
            if (mode === "create") {
                await backend.addBodyEntry({
                    workoutName: payload.workoutName,
                    _meta: true,
                    displayName: payload.workoutName,
                    tag: createTag,
                    notes: "",
                    order: 9999,
                    datetime: new Date().toISOString(),
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 nier-backdrop-enter">
            <div className="relative w-full max-w-md nier-modal-enter">
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <div className="flex items-center gap-3">
                            <span className="text-nier-text-dark text-xl uppercase tracking-wide">
                                {TITLES[mode]}
                            </span>
                            {movement && (
                                <span className="text-nier-text-dark/50 text-sm uppercase tracking-widest">
                                    // {movement}
                                </span>
                            )}
                        </div>
                        <div onClick={onClose} className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">
                            ×
                        </div>
                    </div>

                    <div className="p-5 flex flex-col gap-4">

                        {mode === "create" && (
                            <>
                                <TextField
                                    label="Movement Name"
                                    value={name}
                                    onChange={setName}
                                />
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">Type</span>
                                    <div className="flex gap-2">
                                        {(["upper", "lower"] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setCreateTag(createTag === t ? null : t)}
                                                className={`text-xs uppercase tracking-wide px-4 py-1.5 border border-nier-dark cursor-pointer transition-colors ${
                                                    createTag === t
                                                        ? "bg-nier-text-dark text-nier-100-lighter"
                                                        : "text-nier-text-dark hover:bg-nier-150/50"
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {mode !== "create" && (
                            <DateField label="Date" value={date} onChange={setDate} />
                        )}

                        {mode === "goals" && (
                            <div className="flex gap-3">
                                <NumTextField label="Set Goal"    value={setGoal}    onChange={setSetGoal} />
                                <NumTextField label="Rep Goal"    value={repGoal}    onChange={setRepGoal} />
                                <NumTextField label="Weight Goal" value={weightGoal} onChange={setWeightGoal} />
                            </div>
                        )}

                        {mode === "log" && (
                            <div className="flex gap-3">
                                <NumTextField label="Sets"   value={setsCompleted} onChange={setSetsCompleted} />
                                <NumTextField label="Reps"   value={repsCompleted} onChange={setRepsCompleted} />
                                <NumTextField label="Weight" value={weightUsed}    onChange={setWeightUsed} />
                            </div>
                        )}

                        {error && <p className="text-red-800 text-sm">{error}</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="secondary" label="Cancel"                      handleClick={onClose} />
                            <Button type="primary"   label={saving ? "Saving…" : "Save"} handleClick={handleSave} />
                        </div>
                    </div>
                </article>
            </div>
        </div>,
        document.body
    );
};

export default WorkoutModal;
