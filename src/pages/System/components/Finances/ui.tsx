import { useId, useRef, type ReactNode } from "react";
import { Modal } from "../../../../components/common/Modal";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade } from "../../../../utils/motion";
import type { Envelope } from "../../../../types/finances";

// Small pieces the Finances window repeats. They draw in the same grammar as
// Body — a lighter surface under a nier-150 header band, with the offset
// shadow behind it (docs/chrome.md) — so the window reads as one of the set.

/** A titled block: header band, body, offset shadow. */
// The title strip holds the title and nothing else: view controls go in a
// ToolbarRow under it, actions beside what they act on (docs/chrome.md,
// "Controls"). So there is no slot here for a button.
export const Section = ({ title, children, className = "" }: {
    title: string;
    children: ReactNode;
    className?: string;
}) => (
    <ShadowBox as="section" wrapperClassName={className} className="bg-nier-100-lighter border border-nier-150">
        <div className="min-h-7 bg-nier-150 flex items-center px-3 py-1">
            <span className="text-nier-text-dark text-body uppercase tracking-wide truncate">{title}</span>
        </div>
        {children}
    </ShadowBox>
);

/** The last row of a list: the action that adds one more item to it. */
export const NewRow = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full text-left px-3 py-3 border-t border-nier-150/30 text-label uppercase tracking-widest text-nier-text-dark/70 hover:bg-nier-150/30 hover:text-nier-text-dark cursor-pointer transition-colors"
    >
        {label}
    </button>
);

export const primaryBtn =
    "shrink-0 uppercase tracking-wide text-body px-5 min-h-12 border border-nier-dark bg-nier-text-dark text-nier-100-lighter cursor-pointer hover:bg-nier-text-dark/90 disabled:opacity-35 disabled:cursor-default";
export const secondaryBtn =
    "shrink-0 uppercase tracking-wide text-body px-5 min-h-12 border border-nier-dark text-nier-text-dark cursor-pointer hover:bg-nier-150/50 disabled:opacity-35 disabled:cursor-default";
export const smallBtn =
    "text-eyebrow uppercase tracking-widest px-3 py-1.5 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors disabled:opacity-35 disabled:cursor-default";

const floatingLabel =
    "absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-body peer-focus:bg-nier-100-lighter peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-body peer-[:not(:placeholder-shown)]:bg-nier-100-lighter peer-[:not(:placeholder-shown)]:px-1";

/** A dollar amount. Text, not type=number, so "$1,200" and ".5" both parse. */
export const MoneyField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
    const id = useId();
    return (
        <div className="border border-nier-150 flex h-12 relative w-full min-w-0">
            <input
                id={id}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder=" "
                className="peer focus:outline focus:border-nier-dark w-full min-w-0 p-2 px-4"
            />
            <label htmlFor={id} className={floatingLabel}>{label}</label>
        </div>
    );
};

/**
 * A native select, so a phone opens its own picker. `allowNone` adds a blank
 * first option (Unassigned, or no Envelope) under `noneLabel`.
 */
export const EnvelopeSelect = ({ label, envelopes, value, onChange, noneLabel }: {
    label: string;
    envelopes: Envelope[];
    value: string;
    onChange: (id: string) => void;
    noneLabel?: string;
}) => {
    const id = useId();
    return (
        <div className="border border-nier-150 flex h-12 relative w-full min-w-0">
            <select
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                aria-label={label}
                className="w-full min-w-0 px-3 bg-transparent cursor-pointer focus:outline focus:border-nier-dark"
            >
                {noneLabel !== undefined
                    ? <option value="">{noneLabel}</option>
                    : <option value="" disabled>{label}</option>}
                {envelopes.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
        </div>
    );
};

export const ErrorLine = ({ error }: { error: string }) =>
    error ? <p className="text-red-800 text-label">{error}</p> : null;

/**
 * The form-editor modal every Finances dialog uses: Modal wipes the surface,
 * the contents Cascade on each open (ADR-0012), and a stray tap outside does
 * not discard an edit (docs/chrome.md).
 */
export const EditorModal = ({ open, title, onClose, children }: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
}) => {
    const scope = useRef<HTMLElement>(null);
    useRevealTimeline(open, (tl) => {
        if (scope.current) cascade(tl, scope.current, 0.1);
    }, scope, [open]);

    return (
        <Modal open={open} onClose={onClose} dismissOnOutsidePress={false} label={title} className="w-full max-w-md">
            <article ref={scope} className="bg-nier-100-lighter relative max-h-[85vh] flex flex-col">
                <div className="h-10 bg-nier-150 flex items-center justify-between px-5 shrink-0">
                    <span data-modal-title className="text-nier-text-dark text-title uppercase tracking-wide truncate">{title}</span>
                    <button onClick={onClose} aria-label="Close" className="text-title leading-none cursor-pointer hover:text-nier-dark transition-colors">×</button>
                </div>
                <div data-modal-body className="p-5 flex flex-col gap-4 overflow-y-auto">
                    {children}
                </div>
            </article>
        </Modal>
    );
};

/** ‹ October 2026 › — steps one month at a time. */
export const MonthPicker = ({ label, onPrev, onNext, nextDisabled }: {
    label: string;
    onPrev: () => void;
    onNext: () => void;
    nextDisabled?: boolean;
}) => (
    <div className="flex items-center gap-1">
        <button onClick={onPrev} aria-label="Previous month" className={smallBtn}>‹</button>
        <span className="text-label uppercase tracking-widest text-nier-text-dark px-2 min-w-[9rem] text-center">{label}</span>
        <button onClick={onNext} disabled={nextDisabled} aria-label="Next month" className={smallBtn}>›</button>
    </div>
);
