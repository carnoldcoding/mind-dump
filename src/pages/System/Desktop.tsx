import { useEffect, useRef, useState } from "react";
import ReviewsWindow from "./components/ReviewsWindow";
import BodyWindow from "./components/Body";
import BacklogWindow from "./components/Backlog";
import { useRevealSignal } from "../../hooks/useRevealSignal";
import { useRevealTimeline } from "../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../utils/motion";
import { Panel } from "../../components/common/Panel";
import { usePanelHeight } from "../../hooks/usePanelHeight";

const FolderIcon = ({ selected }: { selected: boolean }) => (
    <svg viewBox="0 0 56 46" width="56" height="46" xmlns="http://www.w3.org/2000/svg">
        <polygon
            points="0,10 0,44 52,44 52,10 22,10 18,4 0,4"
            fill={selected ? "#48483D" : "#A9A38B"}
        />
        <polygon
            points="1,11 17,11 21,5 1,5"
            fill={selected ? "#3A3A31" : "#C6C2A5"}
        />
        <rect x="3" y="15" width="46" height="26" fill={selected ? "#3A3A31" : "#DBD5B3"} />
        <line x1="7" y1="20" x2="45" y2="20" stroke={selected ? "#BDB7A8" : "#48483D"} strokeWidth="0.8" strokeOpacity="0.5" />
        <line x1="7" y1="25" x2="45" y2="25" stroke={selected ? "#BDB7A8" : "#48483D"} strokeWidth="0.8" strokeOpacity="0.35" />
        <line x1="7" y1="30" x2="32" y2="30" stroke={selected ? "#BDB7A8" : "#48483D"} strokeWidth="0.8" strokeOpacity="0.35" />
    </svg>
);

// The three apps the OS runs. Order here is the order the folder icons and the
// tab strip render in.
type AppId = "backlog" | "reviews" | "body";
const APPS: { id: AppId; label: string }[] = [
    { id: "backlog", label: "Backlog" },
    { id: "reviews", label: "Reviews" },
    { id: "body", label: "Body" },
];

const Desktop = () => {
    // Desktop didn't wait for boot before this — unlike Search/Review it
    // could start its own enter animation while <main> was still hidden
    // behind the boot sequence. Gated the same way now.
    const revealed = useRevealSignal();
    const scope = useRef<HTMLDivElement>(null);

    // The frame Wipes as stable chrome; the desktop chrome then Cascades so that
    // nothing arrives un-animated (ADR-0012). An open app carries data-reveal-own,
    // so this Cascade steps over it and the app runs its own entrance.
    useRevealTimeline(revealed, (tl) => {
        wipe(tl, '[data-panel-surface]');
    }, scope);
    const [time, setTime] = useState("");
    const [date, setDate] = useState("");

    // The OS runs apps as tabs, not as nested windows. `openTabs` is the set
    // that is running (each is mounted and keeps its state while it is open);
    // `activeTab` is the one on screen, or null for the desktop itself — the
    // blank-slate folder view, reached by opening nothing or by clicking
    // SYSTEM.OS while apps stay open behind it.
    const [openTabs, setOpenTabs] = useState<AppId[]>([]);
    const [activeTab, setActiveTab] = useState<AppId | null>(null);

    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();
    useRevealTimeline(revealed, (tl) => {
        if (panelRef.current) cascade(tl, panelRef.current, 0.15);
    }, scope);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
            setDate(now.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" }));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    // Opening an app runs it if it isn't already, and brings it to the front.
    // One instance per app: a second open of something already running just
    // focuses its tab.
    const openApp = (id: AppId) => {
        setOpenTabs(prev => (prev.includes(id) ? prev : [...prev, id]));
        setActiveTab(id);
    };

    // Closing the active tab hands focus to the neighbour that took its place
    // (the one before it, or the last if it was the end); closing the last one
    // drops to the desktop.
    const closeTab = (id: AppId) => {
        setOpenTabs(prev => {
            const idx = prev.indexOf(id);
            const next = prev.filter(t => t !== id);
            setActiveTab(cur => (cur !== id ? cur : (next[Math.min(idx, next.length - 1)] ?? null)));
            return next;
        });
    };

    return (
        <Panel
            wrapperRef={scope}
            wrapperClassName="mt-0 lg:mt-5"
            className="bg-nier-50 border border-nier-150 h-[42rem]"
            style={maxHeight ? { maxHeight } : undefined}
            frameRef={panelRef}
        >

                {/* Topbar: SYSTEM.OS is the desktop/home button, then a tab for
                    every running app. The old `// TERMINAL v.2B` legend gave way
                    to the tab strip. */}
                <div className="h-10 bg-nier-150 flex items-stretch flex-shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab(null)}
                        className={`flex items-center px-5 flex-shrink-0 border-r border-nier-dark/15 cursor-pointer transition-colors ${
                            activeTab === null ? "bg-nier-100 text-nier-text-dark" : "text-nier-text-dark/70 hover:bg-nier-150/60"
                        }`}
                    >
                        <span data-window-title className="text-body uppercase tracking-widest font-semibold">SYSTEM.OS</span>
                    </button>
                    {openTabs.map(id => {
                        const app = APPS.find(a => a.id === id)!;
                        const active = activeTab === id;
                        return (
                            <div
                                key={id}
                                className={`flex items-center gap-2 pl-4 pr-2 flex-shrink-0 border-r border-nier-dark/15 transition-colors ${
                                    active ? "bg-nier-100 text-nier-text-dark" : "text-nier-text-dark/60 hover:bg-nier-150/60"
                                }`}
                            >
                                <button
                                    onClick={() => setActiveTab(id)}
                                    className="text-label uppercase tracking-widest cursor-pointer py-2"
                                >
                                    {app.label}
                                </button>
                                <button
                                    onClick={() => closeTab(id)}
                                    aria-label={`Close ${app.label}`}
                                    className="text-label leading-none px-1 text-nier-text-dark/40 hover:text-nier-text-dark cursor-pointer"
                                >✕</button>
                            </div>
                        );
                    })}
                </div>

                {/* Content area: the desktop (folder icons) when no tab is
                    active, otherwise the active app filling the region. Running
                    apps stay mounted so their state survives a tab switch; only
                    the active one is shown. */}
                <div className="relative p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* The blank slate — folders that launch apps. Always in the
                        tree so it reveals with the desktop; hidden while an app
                        is on screen. */}
                    <div className={`absolute top-4 left-4 flex gap-4 z-0 ${activeTab === null ? "" : "hidden"}`}>
                        {APPS.map(app => (
                            <button
                                key={app.id}
                                onClick={() => openApp(app.id)}
                                className="flex flex-col items-center gap-2 cursor-pointer group"
                            >
                                <div className={`p-3 transition-colors ${openTabs.includes(app.id) ? "bg-nier-dark/15" : "hover:bg-nier-150/20"}`}>
                                    <FolderIcon selected={openTabs.includes(app.id)} />
                                </div>
                                <span className={`text-label uppercase tracking-widest font-semibold px-1.5 py-0.5 transition-colors ${
                                    openTabs.includes(app.id)
                                        ? "bg-nier-text-dark text-nier-100-lighter"
                                        : "text-nier-text-dark group-hover:bg-nier-150/40"
                                }`}>
                                    {app.id}
                                </span>
                            </button>
                        ))}
                    </div>

                    {openTabs.map(id => (
                        <div
                            key={id}
                            data-reveal-own
                            className={activeTab === id ? "flex-1 min-h-0 flex flex-col" : "hidden"}
                        >
                            {id === "backlog" && <BacklogWindow />}
                            {id === "reviews" && <ReviewsWindow />}
                            {id === "body" && <BodyWindow />}
                        </div>
                    ))}
                </div>

                {/* Taskbar */}
                <div className="h-8 bg-nier-150 border-t border-nier-dark/20 flex items-center justify-between px-4 flex-shrink-0">
                    <span className="text-label text-nier-text-dark uppercase tracking-widest opacity-50">
                        MIND DUMP OS
                    </span>
                    <div className="flex items-center gap-4">
                        <span className="text-label text-nier-text-dark tracking-wider opacity-60 hidden sm:block">
                            {date}
                        </span>
                        <span className="text-label text-nier-text-dark font-semibold tracking-wider opacity-70">
                            {time}
                        </span>
                    </div>
                </div>
        </Panel>
    );
};

export default Desktop;
