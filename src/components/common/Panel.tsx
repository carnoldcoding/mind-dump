import type { AnimationEvent, CSSProperties, ReactNode, Ref } from 'react';
import type { PanelStage } from '../../hooks/usePanelReveal';
import { enterClass } from '../../utils/animations';

type PanelProps = {
    /** Whether the panel may begin revealing at all — typically the boot sequence's 'header' stage. */
    ready: boolean;
    stage: PanelStage;
    /** Fired when the frame's own wipe lands, ending the 'box' stage. */
    onBoxRevealed: () => void;
    /**
     * Classes for the frame. The caller owns its size, background and borders
     * — Desktop is bg-nier-50 where the rest are bg-nier-100, and baking a
     * default in here would put two competing bg-* classes on one element,
     * where the winner is decided by stylesheet order rather than by the
     * caller. The panel owns only its motion.
     */
    className?: string;
    wrapperClassName?: string;
    style?: CSSProperties;
    frameRef?: Ref<HTMLElement>;
    children: ReactNode;
};

/**
 * A panel: a frame and the offset shadow it casts, drawn as one object.
 *
 * The two used to be sibling elements at every call site, each gated by hand,
 * and two of the four sites gated them differently — the shadow animated in
 * while the frame was still `invisible`, so the shadow arrived before the
 * thing casting it. Both now share a single gate and a single wipe, which is
 * the point of the component: a caller cannot desync them, because a caller
 * cannot address them separately.
 *
 * The frame reports the end of the 'box' stage. Note the target check in
 * `handleAnimationEnd` — `animationend` bubbles, so without it every card
 * finishing its domino inside the panel would be read as the frame's own
 * wipe landing.
 */
export const Panel = ({
    ready,
    stage,
    onBoxRevealed,
    className = '',
    wrapperClassName = '',
    style,
    frameRef,
    children,
}: PanelProps) => {
    const gate = ready ? '' : 'invisible';
    const wipe = enterClass('nier-wipe');

    const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (stage !== 'box') return;
        onBoxRevealed();
    };

    return (
        <div className={`relative ${wrapperClassName}`}>
            <aside
                data-panel-shadow
                aria-hidden="true"
                className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${wipe} ${gate}`}
            />
            <article
                ref={frameRef}
                data-testid="panel-frame"
                style={style}
                className={`nier-panel-frame relative flex flex-col ${wipe} ${gate} ${className}`}
                onAnimationEnd={handleAnimationEnd}
            >
                {children}
            </article>
        </div>
    );
};
