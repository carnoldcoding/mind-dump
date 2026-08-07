// The sections the Review editor divides into, and which of them a given
// Review can actually use. See docs/adr/0008 for why the editor is tabbed.

/** The Categories a Review can be. CONTEXT.md calls this the Category. */
export type Category = 'game' | 'cinema' | 'book';

export type TabId = 'data' | 'critique' | 'mods' | 'media';

/** What the editor knows about a Review when deciding what it can offer. */
export type Subject = {
    type: Category;
    /** Whether the record exists yet — uploads need something to file under. */
    saved: boolean;
};

export type Tab = {
    id: TabId;
    label: string;
    /** False when this Review cannot use the tab. Dimmed, never removed. */
    available: boolean;
};

/**
 * One row per section, so adding a fifth is one entry rather than an edit in
 * four places. Everything a section knows about itself lives here: what it is
 * called, what the hint bar says for it, when it can be used, and — for one
 * that can be unavailable — why it is not.
 *
 * The hint copy is in the register the reference's menus use: flat third
 * person, verb first, so it reads as the interface describing itself rather
 * than addressing a reader. See docs/chrome.md.
 *
 * None of it counts. A line reporting how many sections were written would put
 * a figure on a Critique that CONTEXT.md is explicit should not carry one.
 */
const SECTIONS: {
    id: TabId;
    label: string;
    hint: string;
    available: (subject: Subject) => boolean;
    /** Only for a section that can be unavailable. */
    unavailableHint?: string;
}[] = [
    {
        id: 'data',
        label: 'DATA',
        hint: 'Confirms everything this Review is.',
        available: () => true,
    },
    {
        id: 'critique',
        label: 'CRITIQUE',
        hint: 'Records judgement, section by section.',
        available: () => true,
    },
    {
        // A Mod is a game modification. CONTEXT.md: only meaningful for
        // game-category Reviews.
        id: 'mods',
        label: 'MODS',
        hint: 'Manages modifications applied to this game.',
        available: ({ type }) => type === 'game',
        unavailableHint: 'Modifications are kept for games only.',
    },
    {
        // Screenshots and audio are filed under the Review's id, so there is
        // nothing to hang them on until the record exists.
        id: 'media',
        label: 'MEDIA',
        hint: 'Manages screenshots and soundtrack.',
        available: ({ saved }) => saved,
        unavailableHint: 'Available once this Review is registered.',
    },
];

const sectionFor = (id: TabId) => SECTIONS.find(section => section.id === id);

/**
 * The tabs a Review offers, in bar order.
 *
 * Always four, in one order. A tab the Review cannot use comes back
 * `available: false` rather than missing, so the bar keeps its shape and
 * nothing moves under the pointer when a Category changes or the first save
 * lands — the reference greys its unavailable categories rather than
 * collapsing the list.
 */
export function tabsFor(subject: Subject): Tab[] {
    return SECTIONS.map(({ id, label, available }) => ({
        id,
        label,
        available: available(subject),
    }));
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
 * **The caller has to commit the answer**, not just render it. Leaving the
 * original choice in place would make the fallback temporary: switch back to a
 * game and the editor would jump to Mods unasked, mid-edit on Data, which is
 * exactly the move a fallback is supposed to prevent. The editor writes this
 * result back to the tab it is asking for, so a section becoming available
 * again never moves anyone.
 */
export function resolveTab(chosen: TabId, tabs: Tab[]): TabId {
    return tabs.find(tab => tab.id === chosen)?.available ? chosen : DEFAULT_TAB;
}

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
        const section = sectionFor(hovered);
        if (!section) return '';
        const dimmed = tabs.find(t => t.id === hovered)?.available === false;
        return (dimmed && section.unavailableHint) || section.hint;
    }

    if (!field) return sectionFor(tab)?.hint ?? '';

    return FIELD_HINTS[field] ?? `Records judgement on ${field}.`;
}

/** One line per field of the Data section, in the same register. */
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
