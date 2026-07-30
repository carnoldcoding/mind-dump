import { useState } from "react";
import type { Movement } from "./entry";

type TagFilter = "all" | "upper" | "lower";

type Props = {
    movements: Movement[];
    selected: string | null;
    onSelect: (workoutName: string) => void;
    onEdit: (workoutName: string) => void;
    onReorder: (workoutName: string, direction: -1 | 1) => void;
    onCreate: () => void;
};

const ctrlBtn =
    "text-[10px] uppercase tracking-wide px-3 py-2 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors";

// Selecting a Movement happens constantly; reordering and renaming happen
// once and then basically never. They used to share a row, which is why the
// frequent action was wedged between three targets too small to hit. Manage
// mode splits them: a plain wide target by default, the management controls
// at finger size when explicitly asked for.
const MovementList = ({ movements, selected, onSelect, onEdit, onReorder, onCreate }: Props) => {
    const [tagFilter, setTagFilter] = useState<TagFilter>("all");
    const [managing, setManaging]   = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const filtered = tagFilter === "all" ? movements : movements.filter(m => m.tag === tagFilter);
    const selectedMovement = movements.find(m => m.workoutName === selected) ?? null;

    return (
        <div className="relative shrink-0 w-full md:w-52 bg-nier-100-lighter flex flex-col md:max-h-96">
            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />

            {/* Mobile picker header — on desktop the list is always open, so
                this collapses away entirely. */}
            <button
                onClick={() => setPickerOpen(o => !o)}
                aria-label="Change movement"
                aria-expanded={pickerOpen}
                className="md:hidden min-h-11 bg-nier-150 flex items-center justify-between px-3 cursor-pointer"
            >
                <span className="text-nier-text-dark text-sm uppercase tracking-wide truncate">
                    {selectedMovement?.displayName ?? "Movements"}
                </span>
                <span className="text-nier-text-dark/60 text-xs">{pickerOpen ? "▲" : "▼"}</span>
            </button>

            <div className="hidden md:flex h-7 bg-nier-150 items-center px-3">
                <span className="text-nier-text-dark text-sm">Movements</span>
            </div>

            <div className={`${pickerOpen ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0`}>
                {/* Tag filter */}
                <div className="flex gap-1 px-2 py-1.5 border-b border-nier-150/40 shrink-0">
                    {(["all", "upper", "lower"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setTagFilter(f)}
                            className={`text-[10px] uppercase tracking-wide px-3 py-2 cursor-pointer transition-colors ${
                                tagFilter === f
                                    ? "bg-nier-text-dark text-nier-100-lighter"
                                    : "text-nier-text-dark/50 hover:text-nier-text-dark"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <ul aria-label="Movements" className="flex flex-col overflow-y-auto flex-1 min-h-0 max-h-64 md:max-h-none">
                    {filtered.length === 0 ? (
                        <li className="text-nier-text-dark/40 text-xs uppercase px-3 py-3">
                            {movements.length === 0 ? "No movements yet" : "None in this category"}
                        </li>
                    ) : filtered.map(m => {
                        const isSelected = selected === m.workoutName;
                        const fullIdx = movements.indexOf(m);
                        return (
                            <li
                                key={m.workoutName}
                                className={`flex items-stretch border-b border-nier-150/40 last:border-0 transition-colors ${
                                    isSelected ? "bg-nier-text-dark" : "hover:bg-nier-150/30"
                                }`}
                            >
                                {managing && (
                                    <div className="flex shrink-0">
                                        <button
                                            onClick={() => onReorder(m.workoutName, -1)}
                                            disabled={fullIdx === 0}
                                            aria-label={`Move ${m.displayName} up`}
                                            className={`w-9 min-h-11 text-xs cursor-pointer disabled:opacity-20 disabled:cursor-default ${isSelected ? "text-nier-100-lighter/70" : "text-nier-text-dark/60"}`}
                                        >▲</button>
                                        <button
                                            onClick={() => onReorder(m.workoutName, 1)}
                                            disabled={fullIdx === movements.length - 1}
                                            aria-label={`Move ${m.displayName} down`}
                                            className={`w-9 min-h-11 text-xs cursor-pointer disabled:opacity-20 disabled:cursor-default ${isSelected ? "text-nier-100-lighter/70" : "text-nier-text-dark/60"}`}
                                        >▼</button>
                                    </div>
                                )}

                                <button
                                    onClick={() => { onSelect(m.workoutName); setPickerOpen(false); }}
                                    className={`flex-1 min-w-0 text-left text-xs uppercase tracking-wide px-3 min-h-11 truncate ${isSelected ? "text-nier-100-lighter" : "text-nier-text-dark"}`}
                                >
                                    {m.displayName}
                                </button>

                                {managing && (
                                    <button
                                        onClick={() => onEdit(m.workoutName)}
                                        aria-label={`Edit ${m.displayName}`}
                                        className={`w-11 min-h-11 text-sm cursor-pointer shrink-0 ${isSelected ? "text-nier-100-lighter/70" : "text-nier-text-dark/50"}`}
                                    >✎</button>
                                )}
                            </li>
                        );
                    })}
                </ul>

                <div className="border-t border-nier-150/40 px-2 py-2 flex gap-2 shrink-0">
                    <button className={ctrlBtn} onClick={onCreate}>+ New</button>
                    <button className={ctrlBtn} onClick={() => setManaging(m => !m)}>
                        {managing ? "Done" : "Manage"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MovementList;
