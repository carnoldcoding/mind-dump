// Drag to reorder (specs/finances-envelope-ux.md R8, R11). A list can show a
// subset of what it orders — Body's tag filter hides Movements — so a drop is
// read against what is shown and written into the full order.

/** The list with the item at `from` moved to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const out = [...list];
    const [item] = out.splice(from, 1);
    out.splice(to, 0, item);
    return out;
}

/**
 * The full order after the visible item at `from` is dropped at visible index
 * `to`. The item goes directly before the visible item now below it; dropped
 * last, directly after the last visible item. Hidden items keep their places.
 */
export function moveAmongVisible<T>(full: readonly T[], visible: readonly T[], from: number, to: number): T[] {
    if (from === to) return [...full];
    const shown = moveItem(visible, from, to);
    const item = shown[to];
    const rest = full.filter(x => x !== item);
    const below = shown[to + 1];
    const at = below !== undefined ? rest.indexOf(below) : rest.indexOf(shown[to - 1]) + 1;
    rest.splice(at, 0, item);
    return rest;
}
