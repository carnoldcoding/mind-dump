import { useEffect, useState } from "react";
import ReviewsWindow from "./components/ReviewsWindow";
import BodyWindow from "./components/Body";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { enterClass } from "../../utils/animations";

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

const Desktop = () => {
    // Desktop didn't wait for boot before this — unlike Search/Review it
    // could start its own enter animation while <main> was still hidden
    // behind the boot sequence. Gated the same way now.
    const { active: contentActive } = useStageState('header');
    const panelStage = usePanelReveal(contentActive);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const [time, setTime] = useState("");
    const [date, setDate] = useState("");
    const [openApp, setOpenApp] = useState<string | null>(null);

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

    const handleFolderClick = (app: string) => {
        setOpenApp(prev => prev === app ? null : app);
    };

    return (
        <div className="mt-5 relative">
            {/* Sibling of article, not a child — see Review/index.tsx for
                why: a transform on article would trap a child shadow in
                the wrong stacking context. */}
            <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${contentActive ? enterClass('nier-enter') : 'invisible'}`} />
            <article className={`bg-nier-50 relative border border-nier-150 ${contentActive ? enterClass('nier-enter') : 'invisible'}`}>

                {/* Title bar */}
                <div className={`h-10 bg-nier-150 flex items-center justify-between px-5 ${contentReady ? '' : 'invisible'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-nier-text-dark text-sm uppercase tracking-widest font-semibold">
                            SYSTEM.OS
                        </span>
                        <span className="text-nier-text-dark/40 text-xs uppercase tracking-widest hidden sm:block">
                            // TERMINAL v.2B
                        </span>
                    </div>
                </div>

                {/* Desktop area */}
                <div className={`relative p-4 ${contentReady ? '' : 'invisible'}`}>
                    {/* Icons — own stacking context, sit beneath any open window */}
                    <div className="absolute top-4 left-4 flex gap-4 z-0">
                        {(["reviews", "body"] as const).map(app => (
                            <button
                                key={app}
                                onClick={() => handleFolderClick(app)}
                                className="flex flex-col items-center gap-2 cursor-pointer group"
                            >
                                <div className={`p-3 transition-colors ${openApp === app ? "bg-nier-dark/15" : "hover:bg-nier-150/20"}`}>
                                    <FolderIcon selected={openApp === app} />
                                </div>
                                <span className={`text-xs uppercase tracking-widest font-semibold px-1.5 py-0.5 transition-colors ${
                                    openApp === app
                                        ? "bg-nier-text-dark text-nier-100-lighter"
                                        : "text-nier-text-dark group-hover:bg-nier-150/40"
                                }`}>
                                    {app}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Spacer keeps desktop area tall when no window is open */}
                    {!openApp && <div className="h-48" />}

                    {/* Open window — higher stacking context, only mounted when needed */}
                    {openApp === "reviews" && (
                        <div className="relative z-10">
                            <ReviewsWindow onClose={() => setOpenApp(null)} />
                        </div>
                    )}
                    {openApp === "body" && (
                        <div className="relative z-10">
                            <BodyWindow onClose={() => setOpenApp(null)} />
                        </div>
                    )}
                </div>

                {/* Taskbar */}
                <div className={`h-8 bg-nier-150 border-t border-nier-dark/20 flex items-center justify-between px-4 ${contentReady ? '' : 'invisible'}`}>
                    <span className="text-xs text-nier-text-dark uppercase tracking-widest opacity-50">
                        MIND DUMP OS
                    </span>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-nier-text-dark tracking-wider opacity-60 hidden sm:block">
                            {date}
                        </span>
                        <span className="text-xs text-nier-text-dark font-semibold tracking-wider opacity-70">
                            {time}
                        </span>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default Desktop;
