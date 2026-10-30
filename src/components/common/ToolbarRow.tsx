import type { ReactNode } from 'react';

/**
 * The row under a title strip that holds view controls: filters, sorts,
 * searches, pickers — anything that changes what is shown and no data. A
 * title strip holds only its title; actions sit beside what they act on
 * (docs/chrome.md, "Controls"). Body's tag filter is the model.
 */
export const ToolbarRow = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <div className={`flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-nier-150/40 shrink-0 ${className}`}>
        {children}
    </div>
);
