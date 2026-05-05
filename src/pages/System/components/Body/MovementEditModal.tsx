import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TextField } from "../../../../components/common/TextField";
import { BigTextField } from "../../../../components/common/BigTextField";
import { Button } from "../../../../components/common/Button";
import config from "../../../../config";

export type MovementMeta = {
    id?: string;   // normalised from _id or id on the raw document
    workoutName: string;
    displayName: string;
    tag: "upper" | "lower" | null;
    notes: string;
    order: number;
};

type Props = {
    meta: MovementMeta;
    onClose: () => void;
    onSaved: () => void;
    onDelete: (workoutName: string) => void;
};

const WorkoutModal = ({ meta, onClose, onSaved, onDelete }: Props) => {
    const [displayName, setDisplayName]   = useState(meta.displayName);
    const [tag, setTag]                   = useState<"upper" | "lower" | null>(meta.tag);
    const [notes, setNotes]               = useState(meta.notes);
    const [saving, setSaving]             = useState(false);
    const [error, setError]               = useState("");
    const [deleteStage, setDeleteStage]   = useState<"idle" | "confirm">("idle");
    const [deleteInput, setDeleteInput]   = useState("");
    const [deleteError, setDeleteError]   = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        if (!displayName.trim()) { setError("Name is required"); return; }
        setSaving(true);
        setError("");

        try {
            let res: Response;
            if (meta.id) {
                const url = new URL("/api/body/update_entry", config.apiUri);
                res = await fetch(url.toString(), {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ id: meta.id, displayName: displayName.trim(), tag, notes }),
                });
            } else {
                const url = new URL("/api/body/add_entry", config.apiUri);
                res = await fetch(url.toString(), {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({
                        workoutName: meta.workoutName,
                        _meta: true,
                        displayName: displayName.trim(),
                        tag,
                        notes,
                        order: meta.order,
                        datetime: new Date().toISOString(),
                    }),
                });
            }

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
            <div className="relative w-full max-w-md nier-modal-enter">
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <span className="text-nier-text-dark text-xl uppercase tracking-wide">Edit Movement</span>
                        <div onClick={onClose} className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">×</div>
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
                                        className={`text-xs uppercase tracking-wide px-4 py-1.5 border border-nier-dark cursor-pointer transition-colors ${
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

                        <BigTextField label="Notes" value={notes} onChange={setNotes} />

                        {error && <p className="text-red-800 text-sm">{error}</p>}

                        {deleteStage === "confirm" ? (
                            <div className="flex flex-col gap-2 border-t border-nier-150 pt-3">
                                <p className="text-xs text-nier-text-dark/60">
                                    Type <span className="italic">{meta.displayName}</span> to confirm deletion. This removes all logged data for this movement.
                                </p>
                                <input
                                    autoFocus
                                    className="border border-nier-150 px-3 py-2 text-sm bg-nier-100-lighter focus:outline-none focus:border-nier-dark"
                                    value={deleteInput}
                                    onChange={e => { setDeleteInput(e.target.value); setDeleteError(""); }}
                                />
                                {deleteError && <p className="text-red-800 text-xs">{deleteError}</p>}
                                <div className="flex gap-2 justify-end">
                                    <Button type="secondary" label="Cancel" handleClick={() => { setDeleteStage("idle"); setDeleteInput(""); }} />
                                    <Button type="primary"   label="Confirm Delete" handleClick={() => {
                                        if (deleteInput !== meta.displayName) { setDeleteError("Name doesn't match"); return; }
                                        onDelete(meta.workoutName);
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

export default WorkoutModal;
