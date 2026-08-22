import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePresenceTimeline } from '../../hooks/usePresenceTimeline';
import { useScrollLock } from '../../utils/scrollLock';
import { fade, wipe } from '../../utils/motion';

type ModalProps = {
    /** The caller's intent. The modal decides when it actually leaves. */
    open: boolean;
    onClose: () => void;
    /** Accessible name for the dialog. Omit only for a surface that already labels itself. */
    label?: string;
    /** Layout for the backdrop: z-index, padding, how the surface is centred. */
    backdropClassName?: string;
    /** Width and layout for the surface itself. */
    className?: string;
    /** The offset shadow every solid surface in this app casts. Off for a lightbox. */
    shadow?: boolean;
    /**
     * Whether a press on the dimmed backdrop closes the modal. The overlay
     * contract's per-weight flavor: true for lightweight surfaces (Search, a
     * lightbox), false for form editors where a stray tap outside would throw
     * away an editing session — those dismiss only by their close control or
     * Escape. Either way the backdrop still dims and the page behind stays
     * locked. See docs/chrome.md and docs/adr/0008-fixed-viewport-shell.md.
     */
    dismissOnOutsidePress?: boolean;
    children: ReactNode;
};

/**
 * A modal: a dimming backdrop and the solid surface over it.
 *
 * Seven near-identical copies of this markup existed, each pairing a
 * `bg-black/40` backdrop with a shadowed white panel, each gated by hand with
 * `enterClass`. Two of them had no entrance at all — a bare translucent
 * background with nothing applied — so the backdrop landed in one frame while
 * the thing it dims wiped in over it.
 *
 * **A modal is a solid surface, so it wipes; its backdrop is a dimming field
 * with no geometry, so it fades.** Both start on the same frame, which is what
 * stops the shadow arriving before the thing casting it. See docs/motion.md.
 *
 * Presence is owned here rather than by the caller. Every call site used to
 * write `{open && <SomeModal/>}`, which removes the element from the tree the
 * instant it closes and leaves nothing to animate — the reason nothing in this
 * app has ever animated out. Pass `open` and keep the modal mounted; it plays
 * its entrance in reverse and leaves after.
 */
export const Modal = ({
    open,
    onClose,
    label,
    backdropClassName = 'z-50 flex items-center justify-center p-4',
    className = 'w-full max-w-md',
    shadow = true,
    dismissOnOutsidePress = true,
    children,
}: ModalProps) => {
    const scope = useRef<HTMLDivElement>(null);

    // The lock half of the overlay contract: the page behind is frozen while
    // this is open. The dim is the backdrop below.
    useScrollLock(open);

    const present = usePresenceTimeline(open, (tl) => {
        fade(tl, '[data-modal-backdrop]');
        wipe(tl, '[data-modal-surface]', '<');
    }, scope);

    // Escape closes, and it closes by asking rather than by vanishing — the
    // same route the close button takes, so the exit plays either way.
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!present) return null;

    return createPortal(
        <div
            ref={scope}
            data-modal-backdrop
            className={`fixed inset-0 bg-nier-dark/40 ${backdropClassName}`}
            // A press on the backdrop is a press outside the dialog, and the
            // surface stops its own presses from reaching here. Form editors
            // opt out (dismissOnOutsidePress=false): the backdrop still dims
            // and locks, but only the close control or Escape dismisses.
            onMouseDown={(event) => {
                if (dismissOnOutsidePress && event.target === event.currentTarget) onClose();
            }}
        >
            <div
                data-modal-surface
                role="dialog"
                aria-modal="true"
                aria-label={label}
                className={`relative ${className}`}
            >
                {shadow && (
                    <div aria-hidden="true" className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                )}
                {children}
            </div>
        </div>,
        document.body,
    );
};
