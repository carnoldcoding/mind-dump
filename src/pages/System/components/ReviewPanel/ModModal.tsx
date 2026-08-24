import { useState, useEffect, useRef } from "react";
import { TextField } from "../../../../components/common/TextField";
import { BigTextField } from "../../../../components/common/BigTextField";
import { Button } from "../../../../components/common/Button";
import { Modal } from "../../../../components/common/Modal";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade } from "../../../../utils/motion";

export type Mod = {
    name: string;
    author?: string;
    url?: string;
    notes?: string;
};

type Props = {
    /** Kept mounted while closing, so the exit has something to play over. */
    open: boolean;
    mod?: Mod;
    onSave: (mod: Mod) => void;
    onClose: () => void;
};

const ModModal = ({ open, mod, onSave, onClose }: Props) => {
    const [name,   setName]   = useState(mod?.name   ?? "");
    const [author, setAuthor] = useState(mod?.author  ?? "");
    const [url,    setUrl]    = useState(mod?.url     ?? "");
    const [notes,  setNotes]  = useState(mod?.notes   ?? "");
    const [error,  setError]  = useState("");

    // Heavy editor cascade over Modal's surface wipe: title Decodes, fields
    // Domino, keyed on `open` so it replays each time the editor opens.
    // Modal Wipes the surface; the article's contents then Cascade so nothing
    // arrives un-animated (ADR-0012). Keyed on `open` and the title so it replays
    // each open and when Add/Edit flips.
    const modalTitle = mod ? "Edit Mod" : "Add Mod";
    const articleScope = useRef<HTMLElement>(null);
    useRevealTimeline(open, (tl) => {
        if (articleScope.current) cascade(tl, articleScope.current, 0.1);
    }, articleScope, [open, modalTitle]);

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

    return (
        <Modal open={open} onClose={onClose} dismissOnOutsidePress={false} label="Mod" backdropClassName="z-[120] flex items-center justify-center p-4">
                <article ref={articleScope} className="bg-nier-100-lighter relative">

                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <span data-modal-title className="text-nier-text-dark text-title uppercase tracking-wide">
                            {modalTitle}
                        </span>
                        <div onClick={onClose} className="text-title leading-none cursor-pointer hover:text-nier-dark transition-colors">×</div>
                    </div>

                    <div data-modal-body className="p-5 flex flex-col gap-4">
                        <TextField label="Mod Name" value={name}   onChange={setName} />
                        <TextField label="Author"   value={author} onChange={setAuthor} />
                        <TextField label="URL"      value={url}    onChange={setUrl} />
                        <BigTextField label="Notes" value={notes}  onChange={setNotes} />

                        {error && <p className="text-red-800 text-body">{error}</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="secondary" label="Cancel" handleClick={onClose} />
                            <Button type="primary"   label="Save"   handleClick={handleSave} />
                        </div>
                    </div>
                </article>
        </Modal>
    );
};

export default ModModal;
