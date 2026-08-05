import type { CSSProperties, ReactNode, Ref } from 'react';

type PanelProps = {
    /**
     * Classes for the frame. The caller owns its size, background and borders
     * — Desktop is bg-nier-50 where the rest are bg-nier-100, and baking a
     * default in here would put two competing bg-* classes on one element,
     * where the winner is decided by stylesheet order rather than by the
     * caller. The panel owns only its shape.
     */
    className?: string;
    wrapperClassName?: string;
    style?: CSSProperties;
    frameRef?: Ref<HTMLElement>;
    /**
     * The reveal timeline's scope. It has to be the wrapper rather than the
     * frame, because the shadow is the frame's sibling — scoping to the frame
     * would put half the panel out of the timeline's reach.
     */
    wrapperRef?: Ref<HTMLDivElement>;
    children: ReactNode;
};

/**
 * A panel: a frame and the offset shadow it casts, drawn as one object.
 *
 * Both carry `data-panel-surface`, which is how a reveal timeline addresses
 * them: one Wipe tween over two targets. They used to be siblings gated by
 * hand at every call site, and two of the four sites gated them differently —
 * the shadow animated in while the frame was still `invisible`, so the shadow
 * arrived before the thing casting it. One tween is a stronger guarantee than
 * the shared gate was, because there is no second animation left for the first
 * one to disagree with.
 *
 * The shadow is a **sibling** of the frame, never a child, and must stay one.
 * The Wipe sets `clip-path`, which makes the frame establish its own stacking
 * context — a `-z-1` child would be trapped inside it instead of rendering
 * behind the whole frame as intended. (This held for the `transform` the
 * original entrance used, and holds for `clip-path` for the same reason.)
 *
 * Panel takes no motion props. It used to need `ready`, `stage` and
 * `onBoxRevealed` to place itself in a stage machine that advanced on
 * animation events; a surface now describes its whole entrance in one
 * `useRevealTimeline` build function, and the panel is one of the things that
 * timeline addresses. It does not render conditionally on data either — see
 * docs/motion.md on why the frame no longer waits for its contents.
 */
export const Panel = ({
    className = '',
    wrapperClassName = '',
    style,
    frameRef,
    wrapperRef,
    children,
}: PanelProps) => (
    <div ref={wrapperRef} className={`relative ${wrapperClassName}`}>
        <aside
            data-panel-surface
            data-panel-shadow
            aria-hidden="true"
            className="absolute w-full h-full bg-nier-shadow top-1 left-1"
        />
        <article
            ref={frameRef}
            data-panel-surface
            data-testid="panel-frame"
            style={style}
            className={`nier-panel-frame relative flex flex-col ${className}`}
        >
            {children}
        </article>
    </div>
);
