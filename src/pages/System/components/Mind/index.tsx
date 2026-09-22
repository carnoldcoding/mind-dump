import { useRef, useState } from "react";
import { useMindGraph } from "../../../../store/mind";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../../utils/motion";
import { Panel } from "../../../../components/common/Panel";
import TeachView from "./Teach";
import MapView from "./Map";

// Runs as a tab on the SYSTEM.OS desktop (spec §10): the Desktop owns the frame
// chrome and the close control, so this window carries no title bar of its own.
//
// Teach (spec §17) and Map (spec §8) are built. Patterns and Sessions are
// deferred — they'll be added back as tabs when their design pass happens.

type View = "teach" | "map";
const VIEWS: { id: View; label: string }[] = [
    { id: "teach", label: "Teach" },
    { id: "map", label: "Map" },
];

const MindWindow = () => {
    const { quests, disciplines, loading, error } = useMindGraph();
    const [view, setView] = useState<View>("teach");

    const scope = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    // Chrome (frame + tab strip) reveals ONCE and stays put — no [view] rebuild,
    // so switching tabs never re-animates the strip (that was the flutter). The
    // content region is [data-reveal-own], so this cascade steps over it.
    useRevealTimeline(true, (tl) => { wipe(tl, "[data-panel-surface]"); }, scope);
    useRevealTimeline(true, (tl) => { if (panelRef.current) cascade(tl, panelRef.current, 0.15); }, scope);
    // The content owns its own entrance, rebuilt per view so the new tab's
    // content animates in without touching the chrome. (Teach self-animates and
    // is marked own, so this steps over it.)
    useRevealTimeline(true, (tl) => { if (contentRef.current) cascade(tl, contentRef.current, 0); }, scope, [view]);

    const mastered = quests.filter((q) => q.mastered).length;

    return (
        <Panel
            wrapperRef={scope}
            wrapperClassName="h-full"
            className="bg-nier-100 border border-nier-150 h-full"
            frameRef={panelRef}
        >
            <div className="flex flex-col h-full min-h-0">
                {/* Internal view strip — inverted selection per chrome.md. */}
                <div className="flex items-stretch flex-shrink-0 border-b border-nier-150">
                    {VIEWS.map((v) => (
                        <button
                            key={v.id}
                            onClick={() => setView(v.id)}
                            className={`px-4 py-2 text-label uppercase tracking-widest cursor-pointer transition-colors ${
                                view === v.id
                                    ? "bg-nier-dark text-nier-text-light"
                                    : "text-nier-text-dark/70 hover:bg-nier-150/50"
                            }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Content region — its own reveal (data-reveal-own). Teach owns
                    its height + internal scroll and self-animates; the other
                    views share a scrolling padded region. */}
                <div ref={contentRef} data-reveal-own className="flex-1 min-h-0 flex flex-col">
                    {view === "teach" ? (
                        <div data-reveal-own className="p-4 flex-1 min-h-0"><TeachView /></div>
                    ) : (
                        // The Map owns the full content box (the graph pans; it must not
                        // sit inside a scrolling region).
                        <div className="p-4 flex-1 min-h-0">
                            {error ? <p className="text-label text-nier-text-dark/70">Couldn't reach the learning API.</p>
                                : loading ? <p className="text-label text-nier-text-dark/70">Loading…</p>
                                    : <MapView quests={quests} disciplines={disciplines} mastered={mastered} />}
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
};

export default MindWindow;
