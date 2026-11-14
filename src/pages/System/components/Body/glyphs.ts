// Body — the one set of marks the three views draw with (docs/chrome.md,
// "Body glyphs"). A state is a glyph, not a word, and each glyph has one
// meaning wherever it appears.

import type { Rule } from "../../../../types/body";

export const GLYPH = {
    done: "◆",
    started: "◈",
    open: "◇",
    skipped: "⊘",
    /** The next thing to do, and the control that saves it. */
    next: "➤",
    add: "＋",
    remove: "×",
} as const;

export const RULE_GLYPH: Record<Rule, string> = {
    pastFailure: "▲▲",
    failure: "▲",
    noFailure: "△",
};

/** Done, started or not done, from a count against its total. */
export function stateGlyph(count: number, total: number): string {
    if (total > 0 && count >= total) return GLYPH.done;
    return count > 0 ? GLYPH.started : GLYPH.open;
}

/** One glyph for each planned Set: the logged ones filled. */
export function setPips(logged: number, planned: number): string {
    const filled = Math.min(logged, planned);
    return GLYPH.done.repeat(filled) + GLYPH.open.repeat(Math.max(planned - filled, 0));
}
