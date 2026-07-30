import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NumTextField } from "../../../../components/common/NumTextField";
import { DateField } from "../../../../components/common/DateField";
import { Button } from "../../../../components/common/Button";
import { backend } from "../../../../api/backend";
import { enterClass } from "../../../../utils/animations";
import { atLocalMidnight, fieldNumber, fieldValue } from "./entry";
import type { Entry } from "./entry";

type Props = {
    entry: Entry;
    movementName: string;
    onClose: () => void;
    onSaved: () => void;
    onDelete: (id: string) => void;
};

const toDateStr = (iso: string) => iso.split("T")[0];

// An Entry is one logged set and nothing else, so this form has one shape.
// It used to branch on whether it was editing a goal or a log, because both
// were stored here.
const EntryEditModal = ({ entry, movementName, onClose, onSaved, onDelete }: Props) => {
    const [date, setDate]     = useState(toDateStr(entry.datetime));
    const [sets, setSets]     = useState(fieldValue(entry.setsCompleted));
    const [reps, setReps]     = useState(fieldValue(entry.repsCompleted));
    const [weight, setWeight] = useState(fieldValue(entry.weightUsed));
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        if (!entry.id) return;
        setSaving(true);
        setError("");
        try {
            // Nulls rather than omissions: the backend $sets whatever it's
            // given, so leaving a key out would silently keep the old value
            // and make an emptied field impossible to clear.
            await backend.updateBodyEntry({
                id: entry.id,
                datetime: atLocalMidnight(date),
                setsCompleted: fieldNumber(sets),
                repsCompleted: fieldNumber(reps),
                weightUsed:    fieldNumber(weight),
            });
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
            <div role="dialog" aria-label="Edit Entry" className={`relative w-full max-w-sm ${enterClass('nier-modal-enter')}`}>
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <div className="flex items-center gap-3">
                            <span className="text-nier-text-dark text-xl uppercase tracking-wide">Edit Entry</span>
                            <span className="text-nier-text-dark/50 text-sm uppercase tracking-widest">
                                // {movementName}
                            </span>
                        </div>
                        <button onClick={onClose} aria-label="Close" className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">×</button>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <DateField label="Date" value={date} onChange={setDate} />

                        <div className="flex gap-3">
                            <NumTextField label="Sets"   value={sets}   onChange={setSets} />
                            <NumTextField label="Reps"   value={reps}   onChange={setReps} />
                            <NumTextField label="Weight" value={weight} onChange={setWeight} />
                        </div>

                        {error && <p className="text-red-800 text-sm">{error}</p>}

                        <div className="flex justify-between gap-2 pt-1">
                            <Button type="secondary" label="Delete" handleClick={() => entry.id && onDelete(entry.id)} />
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
