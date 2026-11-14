import type { ReactNode } from "react";
import { GLYPH } from "./glyphs";

// The controls the Body views share. Each shows a glyph where the old views
// showed a word, so each carries its full name for a screen reader and for a
// pointer that rests on it (body-ui R1).

/** A square control that shows only a glyph. `solid` marks the one that saves. */
export const GlyphButton = ({ glyph, label, onClick, type = "button", solid = false, pressed, disabled, className = "" }: {
    glyph: string;
    label: string;
    onClick?: () => void;
    type?: "button" | "submit";
    solid?: boolean;
    pressed?: boolean;
    disabled?: boolean;
    className?: string;
}) => (
    <button
        type={type}
        onClick={onClick}
        aria-label={label}
        title={label}
        aria-pressed={pressed}
        disabled={disabled}
        className={`w-12 h-12 shrink-0 flex items-center justify-center border border-nier-dark text-body leading-none cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default ${
            solid || pressed
                ? "bg-nier-text-dark text-nier-100-lighter hover:bg-nier-text-dark/90"
                : "text-nier-text-dark hover:bg-nier-150/50"
        } ${className}`}
    >
        {glyph}
    </button>
);

/** One choice in a toolbar row; the chosen one inverted (docs/chrome.md). */
export const Chip = ({ children, active, onClick, testId }: {
    children: ReactNode;
    active: boolean;
    onClick: () => void;
    testId?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        data-testid={testId}
        className={`px-3 min-h-9 text-label uppercase tracking-widest whitespace-nowrap cursor-pointer transition-colors ${
            active ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark/70 hover:bg-nier-150/50"
        }`}
    >
        {children}
    </button>
);

/** The row that adds one more item to the list it sits in. */
export const AddRow = ({ label, onClick, first = false }: { label: string; onClick: () => void; first?: boolean }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`w-full min-h-11 px-3 text-left text-body text-nier-text-dark/60 ${first ? "border-b" : "border-t"} border-nier-150/30 hover:bg-nier-150/30 hover:text-nier-text-dark cursor-pointer transition-colors`}
    >
        {GLYPH.add}
    </button>
);
