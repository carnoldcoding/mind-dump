import { useSortable } from "@dnd-kit/react/sortable";
import { animationsDisabled } from "../utils/animations";

// The row half of drag to reorder; the list half is SortableList in
// src/components/common/Sortable.tsx. dnd-kit's slide is an inline style the
// motion-off class cannot reach, so motion off is asked here (docs/motion.md).

/**
 * One row of a SortableList. Put `ref` on the row and `handleRef` on its
 * DragHandle. A row with no handle mounted becomes its own handle — dnd-kit
 * makes the whole row a draggable button — so a row that hides its handle
 * passes `disabled` and leaves `ref` off the row.
 */
export function useSortableRow(id: string, index: number, disabled = false) {
    const { ref, handleRef, isDragging } = useSortable({
        id,
        index,
        disabled,
        transition: animationsDisabled() ? null : undefined,
    });
    return { ref, handleRef, isDragging };
}
