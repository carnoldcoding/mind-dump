// Drag to reorder (specs/finances-envelope-ux.md R8). A drop names two
// positions in the list that is shown; this is the list after the move.

/** The list with the item at `from` moved to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const out = [...list];
    const [item] = out.splice(from, 1);
    out.splice(to, 0, item);
    return out;
}
