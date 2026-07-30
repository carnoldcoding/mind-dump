import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TextField } from "../../../../components/common/TextField";
import { Button } from "../../../../components/common/Button";
import { backend } from "../../../../api/backend";
import { enterClass } from "../../../../utils/animations";
import type { MovementTag } from "./entry";

type Props = {
    // Where this Movement lands in the list — the end of it. Sending the
    // unordered sentinel instead would tie every new Movement together.
    order: number;
    onClose: () => void;
    onSaved: (workoutName: string) => void;
};

// Creating a Movement writes one record. It used to write two: a placeholder
// Entry that rendered nowhere, purely so the movement's name would be
// discoverable, plus the record itself. The Movement record is the Movement
// now, so the placeholder is gone.
const NewMovementModal = ({ order, onClose, onSaved }: Props) => {
    const [name, setName]     = useState("");
    const [tag, setTag]       = useState<MovementTag>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        const workoutName = name.trim();
        if (!workoutName) { setError("Movement name is required"); return; }

        setSaving(true);
        setError("");
        try {
            await backend.addBodyEntry({
                workoutName,
                _meta: true,
                displayName: workoutName,
                tag,
                notes: "",
                order,
                goal: null,
                datetime: new Date().toISOString(),
            });
            onSaved(workoutName);
            onClose();
        } catch {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 ${enterClass('nier-backdrop-enter')}`}>
            <div role="dialog" aria-label="New Movement" className={`relative w-full max-w-md ${enterClass('nier-modal-enter')}`}>
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <span className="text-nier-text-dark text-xl uppercase tracking-wide">New Movement</span>
                        <button onClick={onClose} aria-label="Close" className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">×</button>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <TextField label="Movement Name" value={name} onChange={setName} />

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

export default NewMovementModal;
