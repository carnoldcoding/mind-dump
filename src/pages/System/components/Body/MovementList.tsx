import { useState } from "react";
import type { Movement } from "./entry";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { DragHandle, SortableList } from "../../../../components/common/Sortable";
import { useSortableRow } from "../../../../hooks/useSortableRow";
import { moveAmongVisible } from "../../../../utils/reorder";

type TagFilter = "all" | "upper" | "lower";

type Props = {
    movements: Movement[];
    selected: string | null;
    onSelect: (workoutName: string) => void;
    onEdit: (workoutName: string) => void;
    /**
     * The full order after a drop, every Movement's name first to last. With a
     * tag filter on, the drop is placed among the visible Movements and the
     * hidden ones keep their places (envelope-ux R11).
     */
    onReorder: (order: string[]) => void;
    onCreate: () => void;
};

const ctrlBtn =
    "text-eyebrow uppercase tracking-wide px-3 py-2 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors";

// Selecting a Movement happens constantly; reordering and renaming happen
// once and then basically never. They used to share a row, which is why the
// frequent action was wedged between three targets too small to hit. Manage
// mode splits them: a plain wide target by default, the management controls
// at finger size when explicitly asked for. In Manage mode a drag handle
// leads each row (envelope-ux R10, D4).
const MovementList = ({ movements, selected, onSelect, onEdit, onReorder, onCreate }: Props) => {
    const [tagFilter, setTagFilter] = useState<TagFilter>("all");
    const [managing, setManaging]   = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const filtered = tagFilter === "all" ? movements : movements.filter(m => m.tag === tagFilter);
    const selectedMovement = movements.find(m => m.workoutName === selected) ?? null;

    return (
        <ShadowBox wrapperClassName="shrink-0 w-full md:w-52" className="bg-nier-100-lighter flex flex-col md:max-h-96">

            {/* Mobile picker header — on desktop the list is always open, so
                this collapses away entirely. */}
            <button
                onClick={() => setPickerOpen(o => !o)}
                aria-label="Change movement"
                aria-expanded={pickerOpen}
                className="md:hidden min-h-11 bg-nier-150 flex items-center justify-between px-3 cursor-pointer"
            >
                <span className="text-nier-text-dark text-body uppercase tracking-wide truncate">
                    {selectedMovement?.displayName ?? "Movements"}
                </span>
                <span className="text-nier-text-dark/60 text-label">{pickerOpen ? "▲" : "▼"}</span>
            </button>

            <div className="hidden md:flex h-7 bg-nier-150 items-center px-3">
                <span className="text-nier-text-dark text-body">Movements</span>
            </div>

            <div className={`${pickerOpen ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0`}>
                {/* Tag filter */}
                <div className="flex gap-1 px-2 py-1.5 border-b border-nier-150/40 shrink-0">
                    {(["all", "upper", "lower"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setTagFilter(f)}
                            className={`text-eyebrow uppercase tracking-wide px-3 py-2 cursor-pointer transition-colors ${
                                tagFilter === f
                                    ? "bg-nier-text-dark text-nier-100-lighter"
                                    : "text-nier-text-dark/50 hover:text-nier-text-dark"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <SortableList onMove={(from, to) => onReorder(moveAmongVisible(
                    movements.map(m => m.workoutName), filtered.map(m => m.workoutName), from, to,
                ))}>
                    <ul aria-label="Movements" className="flex flex-col overflow-y-auto flex-1 min-h-0 max-h-64 md:max-h-none">
                        {filtered.length === 0 ? (
                            <li className="text-nier-text-dark/40 text-label uppercase px-3 py-3">
                                {movements.length === 0 ? "No movements yet" : "None in this category"}
                            </li>
                        ) : filtered.map((m, visibleIdx) => (
                            <MovementRow
                                key={m.workoutName}
                                movement={m}
                                index={visibleIdx}
                                selected={selected === m.workoutName}
                                managing={managing}
                                onSelect={() => { onSelect(m.workoutName); setPickerOpen(false); }}
                                onEdit={() => onEdit(m.workoutName)}
                            />
                        ))}
                    </ul>
                </SortableList>

                <div className="border-t border-nier-150/40 px-2 py-2 flex gap-2 shrink-0">
                    <button className={ctrlBtn} onClick={onCreate}>+ New</button>
                    <button className={ctrlBtn} onClick={() => setManaging(m => !m)}>
                        {managing ? "Done" : "Manage"}
                    </button>
                </div>
            </div>
        </ShadowBox>
    );
};

const MovementRow = ({ movement: m, index, selected: isSelected, managing, onSelect, onEdit }: {
    movement: Movement;
    index: number;
    selected: boolean;
    managing: boolean;
    onSelect: () => void;
    onEdit: () => void;
}) => {
    const { ref, handleRef, isDragging } = useSortableRow(m.workoutName, index, !managing);
    return (
        <li
            // Outside Manage mode the row is not registered with dnd-kit at
            // all, which would otherwise make it a draggable button.
            ref={managing ? ref : undefined}
            className={`flex items-stretch border-b border-nier-150/40 last:border-0 transition-colors ${
                isSelected ? "bg-nier-text-dark" : isDragging ? "bg-nier-150/50" : "hover:bg-nier-150/30"
            }`}
        >
            {managing && (
                <DragHandle
                    handleRef={handleRef}
                    label={`Reorder ${m.displayName}`}
                    className={isSelected ? "text-nier-100-lighter/70" : "text-nier-text-dark/60"}
                />
            )}

            <button
                onClick={onSelect}
                className={`flex-1 min-w-0 text-left text-label uppercase tracking-wide px-3 min-h-11 truncate ${isSelected ? "text-nier-100-lighter" : "text-nier-text-dark"}`}
            >
                {m.displayName}
            </button>

            {managing && (
                <button
                    onClick={onEdit}
                    aria-label={`Edit ${m.displayName}`}
                    className={`w-11 min-h-11 text-body cursor-pointer shrink-0 ${isSelected ? "text-nier-100-lighter/70" : "text-nier-text-dark/50"}`}
                >✎</button>
            )}
        </li>
    );
};

export default MovementList;
