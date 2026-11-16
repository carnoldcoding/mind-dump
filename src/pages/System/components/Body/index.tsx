import { useCallback, useEffect, useRef, useState } from "react";
import { backend } from "../../../../api/backend";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../../utils/motion";
import { Panel } from "../../../../components/common/Panel";
import { TabStrip } from "../../../../components/common/TabStrip";
import { todayIso } from "../Finances/money";
import TodayTab from "./TodayTab";
import type { Ready } from "./TodayTab";
import PlanTab from "./PlanTab";
import ProgressTab from "./ProgressTab";
import type { BodyData } from "../../../../types/body";

// A local run can pin the date, to look at a training day on a rest day:
// VITE_BODY_TODAY=2026-11-16 in .env.local. Only the dev server reads it: a
// build ignores it, and so does a test run, which also loads .env.local.
const bodyToday = (): string => (import.meta.env.MODE === "development" && import.meta.env.VITE_BODY_TODAY) || todayIso();

type ActiveTab = "today" | "plan" | "progress";

const TABS: { id: ActiveTab; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "plan", label: "Plan" },
    { id: "progress", label: "Progress" },
];

// Body, as a System app (specs/mind-dump-body-plan.md). It opens on Today,
// which answers "what do I do now"; Plan holds the rare edits and Progress the
// review. Runs as a tab on the SYSTEM.OS desktop: the Desktop owns the frame
// chrome and the close control, so this window has no title bar of its own.
const BodyWindow = () => {
    // Mind's split (docs/motion.md): the frame Wipes and the chrome — the tab
    // strip — Cascades once, on open. Only the tab content Cascades again, when
    // the data first lands and on a tab change. A reload after a save animates
    // nothing; the numbers change in place. Each tab is one frame that fills
    // the height and scrolls its own list and pane.
    const scope = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => { wipe(tl, '[data-panel-surface]'); }, scope);
    useRevealTimeline(true, (tl) => { if (panelRef.current) cascade(tl, panelRef.current, 0.15); }, scope);

    const [data, setData] = useState<BodyData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>("today");

    useRevealTimeline(true, (tl) => { if (contentRef.current) cascade(tl, contentRef.current, 0); }, scope, [data === null, activeTab]);

    // The browser's date decides which day it is; the server runs in UTC.
    const refresh = useCallback(async () => {
        try {
            setData(await backend.getBody(bodyToday()));
            setLoadError(false);
        } catch {
            setLoadError(true);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const ready = data && data.plan && data.summary ? (data as Ready) : null;

    return (
        <Panel
            wrapperRef={scope}
            wrapperClassName="h-full"
            className="bg-nier-100 border border-nier-150 h-full"
            frameRef={panelRef}
        >
            <div className="flex flex-col h-full min-h-0">
                <TabStrip tabs={TABS} active={activeTab} onChange={setActiveTab} />

                <div className="p-2 md:p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
                    {ready === null ? (
                        <div className="h-64 bg-nier-100-lighter border border-nier-150 flex items-center justify-center px-4 text-center">
                            <span className="text-nier-text-dark/40 text-label uppercase tracking-widest">
                                {loadError
                                    ? "Couldn't reach the body API."
                                    : data === null
                                        ? "Loading…"
                                        : "No Plan yet. Run the Body seed in the backend."}
                            </span>
                        </div>
                    ) : (
                        <div ref={contentRef} data-reveal-own className="flex flex-col gap-4 flex-1 min-h-0">
                            {activeTab === "today" && <TodayTab data={ready} onChanged={refresh} />}
                            {activeTab === "plan" && <PlanTab data={ready} onChanged={refresh} />}
                            {activeTab === "progress" && <ProgressTab data={ready} onChanged={refresh} />}
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
};

export default BodyWindow;
