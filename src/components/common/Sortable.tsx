import type { ReactNode } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { Feedback } from "@dnd-kit/dom";
import { animationsDisabled } from "../../utils/animations";

// Drag to reorder, for every list in System that has a manual order
// (specs/finances-envelope-ux.md R4–R8, R10). dnd-kit owns the drag: pointer
// and touch through its pointer sensor, the arrow keys through its keyboard
// sensor, and scrolling near a scroll area's edge through its auto-scroller.
//
// Its motion is inline styles, not a CSS transition, so the `motion-off`
// class cannot reach it. Motion off is asked here instead: the items stop
// sliding into place and the drop does not animate (docs/motion.md).

/** The list's drag context. `onMove` gets the visible indices of a drop. Rows use `useSortableRow`. */
export const SortableList = ({ onMove, children }: {
    onMove: (from: number, to: number) => void;
    children: ReactNode;
}) => (
    <DragDropProvider
        plugins={defaults => animationsDisabled()
            ? [...defaults.filter(p => p !== Feedback), Feedback.configure({ dropAnimation: null })]
            : defaults}
        onDragEnd={event => {
            const source = event.operation.source;
            if (event.canceled || !isSortable(source)) return;
            if (source.initialIndex !== source.index) onMove(source.initialIndex, source.index);
        }}
    >
        {children}
    </DragDropProvider>
);

/** The grip that starts a drag. Only the handle does, so a tap on the row keeps its own job. */
export const DragHandle = ({ handleRef, label, className = "" }: {
    handleRef: (element: Element | null) => void;
    label: string;
    className?: string;
}) => (
    <button
        ref={handleRef}
        type="button"
        aria-label={label}
        onClick={e => e.stopPropagation()}
        className={`w-9 min-h-11 shrink-0 flex items-center justify-center text-body touch-none cursor-grab active:cursor-grabbing ${className}`}
    >
        ☰
    </button>
);
