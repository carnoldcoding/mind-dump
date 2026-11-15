// Body — the one set of marks the three views draw with (docs/chrome.md,
// "Body glyphs"). A state is a glyph, not a word, and each glyph has one
// meaning wherever it appears.

import type { Rule, Trend } from "../../../../types/body";

export const GLYPH = {
    done: "◆",
    started: "◈",
    open: "◇",
    skipped: "⊘",
    /** The selected row: where attention is. Never a control. */
    next: "➤",
    /** The control that saves or marks done. Not the caret: one says where, the other says finish. */
    save: "✓",
    /** One less and one more of the number beside them. */
    less: "−",
    more: "+",
    add: "+",
    remove: "×",
} as const;

export const RULE_GLYPH: Record<Rule, string> = {
    pastFailure: "▲▲",
    failure: "▲",
    noFailure: "△",
};

/** Arrows, because ▲ and △ already mean a Rule. */
export const TREND_GLYPH: Record<Trend, string> = { up: "↗", down: "↘", same: "→" };

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
