// The sections the Review editor divides into, and which of them a given
// Review can actually use. See docs/adr/0008 for why the editor is tabbed.

export type TabId = 'data' | 'critique' | 'mods' | 'media';

export type Tab = {
    id: TabId;
    label: string;
    /** False when this Review cannot use the tab. Dimmed, never removed. */
    available: boolean;
};

/**
 * The tabs a Review offers, in bar order.
 *
 * Always four, in one order. A tab the Review cannot use comes back
 * `available: false` rather than missing, so the bar keeps its shape and
 * nothing moves under the pointer when a Category changes or the first save
 * lands — the reference greys its unavailable categories rather than
 * collapsing the list.
 */
export function tabsFor(review: { type: string; saved: boolean }): Tab[] {
    return [
        { id: 'data', label: 'DATA', available: true },
        { id: 'critique', label: 'CRITIQUE', available: true },
        // A Mod is a game modification. CONTEXT.md: only meaningful for
        // game-category Reviews.
        { id: 'mods', label: 'MODS', available: review.type === 'game' },
        // Screenshots and audio are filed under the Review's id, so there is
        // nothing to hang them on until the record exists.
        { id: 'media', label: 'MEDIA', available: review.saved },
    ];
}

/** The tab the editor opens on, and the one it returns to when orphaned. */
export const DEFAULT_TAB: TabId = 'data';

/**
 * The tab actually showing, given the one the reader chose.
 *
 * A choice can stop being valid without the reader doing anything to it:
 * switching a game to cinema takes Mods away underneath them. Rather than
 * leave them on a panel with nothing in it, the editor falls back.
 *
 * Only the open tab going *unavailable* moves anyone. A tab becoming available
 * — Media, the moment the first autosave lands — does not, because the reader
 * did not ask to go there and having the editor jump mid-sentence would be
 * worse than the click it saves.
 */
export function resolveTab(chosen: TabId, tabs: Tab[]): TabId {
    return tabs.find(tab => tab.id === chosen)?.available ? chosen : DEFAULT_TAB;
}

// ── What the hint bar says ───────────────────────────────────────────
//
// The reference's menus keep a line along the bottom describing whatever is
// under the cursor, in a flat third person — "Displays all items", not "Here
// you can view your items". Every line below is a verb the interface performs,
// which is what makes it read as a machine describing itself.
//
// None of them count. A line saying how many sections were written would put a
// figure on a Critique that CONTEXT.md is explicit should not carry one.

const FIELD_HINTS: Record<string, string> = {
    title: 'Registers the name this Review is filed under.',
    slug: 'Sets the address this Review answers to.',
    type: 'Determines which sections the Critique offers.',
    creator: 'Records the developer, director or author.',
    releaseDate: 'Records when the work was released.',
    rating: 'Assigns a final score. Ten point scale.',
    status: "Sets the work's current standing.",
    genres: 'Applies descriptive tags drawn from this Category.',
    imagePath: 'Points to the cover art.',
    description: 'Records a summary shown before the Critique.',
};

const TAB_HINTS: Record<TabId, string> = {
    data: 'Confirms everything this Review is.',
    critique: 'Records judgement, section by section.',
    mods: 'Manages modifications applied to this game.',
    media: 'Manages screenshots and soundtrack.',
};

/** Why a tab cannot be opened. Shown in place of its description. */
const UNAVAILABLE_HINTS: Record<TabId, string> = {
    data: '',
    critique: '',
    mods: 'Modifications are kept for games only.',
    media: 'Available once this Review is registered.',
};

/**
 * The line along the bottom of the editor.
 *
 * Hovering a tab wins over the focused field, because the pointer is the more
 * recent statement of what the reader is asking about. A dimmed tab answers
 * why it is dimmed — the one thing looking at it cannot tell them.
 */
export function hintFor({
    field,
    tab,
    tabs,
    hovered,
}: {
    field: string | null;
    tab: TabId;
    tabs: Tab[];
    hovered?: TabId;
}): string {
    if (hovered) {
        const target = tabs.find(t => t.id === hovered);
        return target && !target.available
            ? UNAVAILABLE_HINTS[hovered]
            : TAB_HINTS[hovered];
    }

    if (!field) return TAB_HINTS[tab];

    // Critique sections are per-Category, so their lines are built rather than
    // listed: there is no fixed set of names to write copy against.
    return FIELD_HINTS[field] ?? `Records judgement on ${field}.`;
}
