// Chart colors for the Report tab. The nier palette (docs/chrome.md) has no
// hues, only khaki and olive steps, and nine charts cannot tell eight
// Envelopes apart in shades of one color. These are earthy hues picked to sit
// on that surface, checked with a palette validator against `#f0e9c5` (the
// lighter chart surface): every slot clears 3:1 contrast, and each adjacent
// pair stays apart under the common forms of color blindness. The
// closest pair is near the floor, so every multi-series chart also carries a
// legend and a gap between fills — color is never the only cue.
//
// Order is fixed. An Envelope keeps its slot from its place in the Envelope
// list, so Groceries is the same color in every chart and every month.

import type { Envelope } from "../../../../types/finances";

export const SERIES = ["#2a6aa8", "#b0583a", "#16907a", "#977700", "#8a4f7d", "#5f7a2a", "#5a55a0", "#a8403f"];

/** Envelopes past the eighth fold into one series in this neutral. */
export const OTHER = "#8A8570";

export const INCOME = SERIES[2];
export const SPENDING = SERIES[1];
export const INK = "#3A3A31";
export const INK_LIGHT = "#C4BEAC";
export const GRID = "rgba(72, 72, 61, 0.08)";
export const SURFACE = "#f0e9c5";

/** Light to dark, one hue: the heatmap's ramp, ending on the frame color. */
export const RAMP = ["#C6C2A5", "#B0A981", "#8C865F", "#6A6748", "#48483D"];

/** Each Envelope's slot by its place in the list; null past the eighth. */
export function envelopeColors(envelopes: Envelope[]): Map<string, string | null> {
    const ordered = [...envelopes].sort((a, b) => a.sortOrder - b.sortOrder);
    return new Map(ordered.map((e, i) => [e._id, SERIES[i] ?? null]));
}
