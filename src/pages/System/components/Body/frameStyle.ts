// Body — the class strings the list-and-pane frame shares (docs/chrome.md,
// "List and pane"). Plain strings, so a row that cannot be the shared ListRow
// — a Plan row is a drag target, not a button — still draws as one.

/** A row of a list: one line, one height, inverted when selected. */
export const rowClass = (selected: boolean, paired = false): string =>
    `w-full flex items-center gap-3 px-3 h-11 shrink-0 text-left cursor-pointer transition-colors border-b border-nier-150/30 ${
        paired ? "border-l-4 border-l-nier-150" : ""
    } ${selected ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark hover:bg-nier-150/40"}`;

export const EYEBROW = "text-eyebrow uppercase tracking-widest text-nier-text-dark/50";
export const FACT = "flex items-baseline gap-3 text-label text-nier-text-dark/70 tabular-nums";
/** The content of a pane that is not a chart: bounded, so a control is never far from what it acts on. */
export const BOUND = "w-full max-w-lg flex flex-col gap-3";
