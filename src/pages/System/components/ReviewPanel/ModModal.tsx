import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TextField } from "../../../../components/common/TextField";
import { BigTextField } from "../../../../components/common/BigTextField";
import { Button } from "../../../../components/common/Button";

export type Mod = {
    name: string;
    author?: string;
    url?: string;
    notes?: string;
};

type Props = {
    mod?: Mod;
    onSave: (mod: Mod) => void;
    onClose: () => void;
};

const ModModal = ({ mod, onSave, onClose }: Props) => {
    const [name,   setName]   = useState(mod?.name   ?? "");
    const [author, setAuthor] = useState(mod?.author  ?? "");
    const [url,    setUrl]    = useState(mod?.url     ?? "");
    const [notes,  setNotes]  = useState(mod?.notes   ?? "");
    const [error,  setError]  = useState("");

    useEffect(() => {
        const prev = document.body.style.overflow;
        return () => { document.body.style.overflow = prev; };
    }, []);

    const handleSave = () => {
        if (!name.trim()) { setError("Name is required"); return; }
        onSave({
            name:   name.trim(),
            author: author.trim() || undefined,
            url:    url.trim()    || undefined,
            notes:  notes.trim()  || undefined,
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/40 z-[120] flex items-center justify-center p-4 nier-backdrop-enter">
            <div className="relative w-full max-w-md nier-modal-enter">
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                <article className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <span className="text-nier-text-dark text-xl uppercase tracking-wide">
                            {mod ? "Edit Mod" : "Add Mod"}
                        </span>
                        <div onClick={onClose} className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors">×</div>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <TextField label="Mod Name" value={name}   onChange={setName} />
                        <TextField label="Author"   value={author} onChange={setAuthor} />
                        <TextField label="URL"      value={url}    onChange={setUrl} />
                        <BigTextField label="Notes" value={notes}  onChange={setNotes} />

                        {error && <p className="text-red-800 text-sm">{error}</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="secondary" label="Cancel" handleClick={onClose} />
                            <Button type="primary"   label="Save"   handleClick={handleSave} />
                        </div>
                    </div>
                </article>
            </div>
        </div>,
        document.body
    );
};

export default ModModal;
