import type { ReactNode } from "react";

// The controls the Body views share. Each shows a glyph where the old views
// showed a word, so each carries its full name for a screen reader and for a
// pointer that rests on it (body-ui R1).

/**
 * A square control that shows only a glyph. It is 48px, the height of a field,
 * so the two line up side by side (body-today R25); it takes no size from its
 * caller. `solid` marks the one that saves; `bare` drops the border for one
 * that sits at the end of a list row.
 */
export const GlyphButton = ({ glyph, label, onClick, type = "button", solid = false, bare = false, pressed, disabled, autoFocus, className = "" }: {
    glyph: string;
    label: string;
    onClick?: () => void;
    type?: "button" | "submit";
    solid?: boolean;
    bare?: boolean;
    pressed?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    className?: string;
}) => (
    <button
        type={type}
        onClick={onClick}
        aria-label={label}
        title={label}
        aria-pressed={pressed}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-12 h-12 shrink-0 flex items-center justify-center text-body leading-none cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default ${
            bare ? "" : "border border-nier-dark"
        } ${
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
