import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NumTextField } from "../../../../components/common/NumTextField";
import { DateField } from "../../../../components/common/DateField";
import { Button } from "../../../../components/common/Button";
import config from "../../../../config";

export type EntryToEdit = {
    id: string;
    datetime: string;
    weightUsed?: number;
    setsCompleted?: number;
    repsCompleted?: number;
    weightGoal?: number;
    setGoal?: number;
    repGoal?: number;
};

type Props = {
    entry: EntryToEdit;
    movementName: string;
    onClose: () => void;
    onSaved: () => void;
    onDelete: (id: string) => void;
};

const toDateStr = (iso: string) => iso.split("T")[0];

const EntryEditModal = ({ entry, movementName, onClose, onSaved, onDelete }: Props) => {
    const isGoal = entry.weightGoal != null || entry.setGoal != null || entry.repGoal != null;

    const [date, setDate]               = useState(toDateStr(entry.datetime));
    const [weightUsed, setWeightUsed]   = useState(entry.weightUsed   != null ? String(entry.weightUsed)   : "");
    const [setsCompleted, setSetsCompleted] = useState(entry.setsCompleted != null ? String(entry.setsCompleted) : "");
    const [repsCompleted, setRepsCompleted] = useState(entry.repsCompleted != null ? String(entry.repsCompleted) : "");
    const [weightGoal, setWeightGoal]   = useState(entry.weightGoal   != null ? String(entry.weightGoal)   : "");
    const [setGoal, setSetGoal]         = useState(entry.setGoal      != null ? String(entry.setGoal)      : "");
    const [repGoal, setRepGoal]         = useState(entry.repGoal      != null ? String(entry.repGoal)      : "");
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const payload: Record<string, unknown> = {
                id: entry.id,
                datetime: new Date(date).toISOString(),
            };
            if (!isGoal) {
                if (weightUsed)    payload.weightUsed    = Number(weightUsed);
                if (setsCompleted) payload.setsCompleted = Number(setsCompleted);
                if (repsCompleted) payload.repsCompleted = Number(repsCompleted);
            } else {
                if (weightGoal)    payload.weightGoal    = Number(weightGoal);
                if (setGoal)       payload.setGoal       = Number(setGoal);
                if (repGoal)       payload.repGoal       = Number(repGoal);
            }
            const url = new URL("/api/body/update_entry", config.apiUri);
            const res = await fetch(url.toString(), {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else setError("Save failed");
        } catch {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 nier-backdrop-enter">
            <div className="relative w-full max-w-sm nier-modal-enter">
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <div className="flex items-center gap-3">
                            <span className="text-nier-text-dark text-xl uppercase tracking-wide">
                                {isGoal ? "Edit Goals" : "Edit Entry"}
                            </span>
                            <span className="text-nier-text-dark/50 text-sm uppercase tracking-widest">
                                // {movementName}
                            </span>
                        </div>
                        <div onClick={onClose} className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">×</div>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <DateField label="Date" value={date} onChange={setDate} />

                        {!isGoal && (
                            <div className="flex gap-3">
                                <NumTextField label="Weight" value={weightUsed}    onChange={setWeightUsed} />
                                <NumTextField label="Sets"   value={setsCompleted} onChange={setSetsCompleted} />
                                <NumTextField label="Reps"   value={repsCompleted} onChange={setRepsCompleted} />
                            </div>
                        )}

                        {isGoal && (
                            <div className="flex gap-3">
                                <NumTextField label="Weight Goal" value={weightGoal} onChange={setWeightGoal} />
                                <NumTextField label="Set Goal"    value={setGoal}    onChange={setSetGoal} />
                                <NumTextField label="Rep Goal"    value={repGoal}    onChange={setRepGoal} />
                            </div>
                        )}

                        {error && <p className="text-red-800 text-sm">{error}</p>}

                        <div className="flex justify-between gap-2 pt-1">
                            <Button type="secondary" label="Delete" handleClick={() => onDelete(entry.id)} />
                            <div className="flex gap-2">
                                <Button type="secondary" label="Cancel"                       handleClick={onClose} />
                                <Button type="primary"   label={saving ? "Saving…" : "Save"} handleClick={handleSave} />
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </div>,
        document.body
    );
};

export default EntryEditModal;
