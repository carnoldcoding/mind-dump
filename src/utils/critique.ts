// What a Critique is made of. See CONTEXT.md for the term.
//
// A Category makes four sections available. It does not require them: a
// fighting game with nothing worth saying about story is finished at three,
// and the four exist so there is somewhere to put a thought rather than as a
// standard the work has to meet.
//
// That is why nothing here counts. There is no `sectionCount`, no `progress`
// and no ratio, because the moment one exists a surface will render "3 / 4"
// and the interface will be imposing exactly the uniformity this shape avoids.
// Callers ask which sections were written and draw those.
//
// The lists were private to ReviewModal, which is where they are edited; the
// Backlog needs them too, so they live here and the editor imports them.

/** The Categories that have a Critique, and the sections each one offers. */
const SECTIONS: Record<string, readonly string[]> = {
    game: ["story", "gameplay", "graphics", "sound"],
    cinema: ["story", "cinematography", "casting", "sound"],
    book: ["story", "world", "characters", "writing"],
};

/**
 * A geometric mark per section, in the register the reference's menus use.
 * Shared with the Review detail's tab bar so a section looks the same wherever
 * it is named.
 */
export const SECTION_GLYPH: Record<string, string> = {
    story: "✦",
    gameplay: "✥",
    graphics: "◈",
    sound: "♪",
    world: "⬟",
    characters: "⬢",
    writing: "✎",
    cinematography: "▣",
    casting: "◉",
    mods: "⚙",
};

/** The sections a Category offers, in display order. Empty for one with none. */
export const sectionsFor = (type: string): readonly string[] => SECTIONS[type] ?? [];

/**
 * The sections that have something in them, in the Category's own order.
 *
 * Ordered by the Category rather than by the record, so two Reviews with the
 * same sections written always draw the same marks in the same places — the
 * order keys land in an object is not something a reader should be able to see.
 *
 * Keys the Category does not offer are skipped: a book's fields on a game
 * record are not something this Category can show, whatever put them there.
 */
export function writtenSections(review: {
    type: string;
    review?: unknown;
}): string[] {
    const written = (review.review ?? {}) as Record<string, unknown>;
    return sectionsFor(review.type).filter(section => {
        const text = written[section];
        return typeof text === "string" && text.trim() !== "";
    });
}
