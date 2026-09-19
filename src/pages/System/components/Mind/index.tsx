import { useRef, useState } from "react";
import { useMindGraph } from "../../../../store/mind";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../../utils/motion";
import { Panel } from "../../../../components/common/Panel";
import type { MindQuest } from "../../../../types/mind";

// Runs as a tab on the SYSTEM.OS desktop (spec §10): the Desktop owns the frame
// chrome and the close control, so this window carries no title bar of its own.
//
// SCAFFOLD: the four views below are real surfaces in the app's chrome, wired to
// live data where it's cheap, but the RICH visuals — the two-lens graph/tree
// map, the streaming teaching chat with animated result cards, and the pattern
// charts — are the design pass to do together (spec §8–§10, design directive).
// They are marked as placeholders, not faked.

type View = "teach" | "map" | "patterns" | "sessions";
const VIEWS: { id: View; label: string }[] = [
    { id: "teach", label: "Teach" },
    { id: "map", label: "Map" },
    { id: "patterns", label: "Patterns" },
    { id: "sessions", label: "Sessions" },
];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">{children}</span>
);

// A view still being designed — honest about it, in-chrome, not a fake mockup.
const Placeholder = ({ title, note }: { title: string; note: string }) => (
    <div className="flex flex-col gap-2 p-4 border border-nier-150 bg-nier-100-lighter">
        <Eyebrow>{title}</Eyebrow>
        <p className="text-label text-nier-text-dark/70">{note}</p>
    </div>
);

const MindWindow = () => {
    const { quests, disciplines, loading, error } = useMindGraph();
    const [view, setView] = useState<View>("teach");

    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => { wipe(tl, "[data-panel-surface]"); }, scope);
    const panelRef = useRef<HTMLElement>(null);
    useRevealTimeline(true, (tl) => { if (panelRef.current) cascade(tl, panelRef.current, 0.15); }, scope, [view]);

    const mastered = quests.filter((q) => q.mastered).length;
    const due = quests.filter((q) => q.mastered && !q.prestiged && q.nextRecallDue && new Date(q.nextRecallDue) <= new Date());

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

                <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
                    {error && <p className="text-label text-nier-text-dark/70">Couldn't reach the learning API.</p>}
                    {loading && <p className="text-label text-nier-text-dark/70">Loading…</p>}

                    {!loading && !error && view === "teach" && <TeachView due={due} />}
                    {!loading && !error && view === "map" && <MapView quests={quests} disciplines={disciplines} mastered={mastered} />}
                    {!loading && !error && view === "patterns" && <PatternsView />}
                    {!loading && !error && view === "sessions" && <SessionsView />}
                </div>
            </div>
        </Panel>
    );
};

const TeachView = ({ due }: { due: MindQuest[] }) => (
    <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
            <Eyebrow>Recalls due</Eyebrow>
            <p className="text-heading text-nier-text-dark">{due.length}</p>
            {due.length > 0 && (
                <ul className="text-label text-nier-text-dark/70 list-none flex flex-col gap-0.5">
                    {due.map((q) => <li key={q._id}>➤ {q.title}</li>)}
                </ul>
            )}
        </div>
        <Placeholder
            title="Teaching conversation"
            note="The streaming chat with Claude, its 'computing' acks and animated authoritative result cards, lands here — design pass together (spec §2, §6, design directive)."
        />
    </div>
);

const MapView = ({ quests, disciplines, mastered }: { quests: MindQuest[]; disciplines: { _id: string; slug: string; domain: string; logos: number }[]; mastered: number }) => {
    // A plain grouped list stands in for the two-lens map for now: it proves the
    // data flows and reads in-chrome. The tree/graph lenses (spec §8) are the
    // design pass.
    const byDiscipline = new Map<string, MindQuest[]>();
    for (const q of quests) {
        const key = `${q.domain}/${q.discipline}`;
        (byDiscipline.get(key) ?? byDiscipline.set(key, []).get(key)!).push(q);
    }
    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-6">
                <div className="flex flex-col"><Eyebrow>Quests</Eyebrow><span className="text-heading text-nier-text-dark">{quests.length}</span></div>
                <div className="flex flex-col"><Eyebrow>Mastered</Eyebrow><span className="text-heading text-nier-text-dark">{mastered}</span></div>
                <div className="flex flex-col"><Eyebrow>Disciplines</Eyebrow><span className="text-heading text-nier-text-dark">{disciplines.length}</span></div>
            </div>
            <Placeholder
                title="Map — tree & graph lenses"
                note="Toggleable Domain→Discipline→Quest tree and the [[wikilink]] knowledge graph render here, colored by mastery/recall state (spec §8). Grouped list below stands in until then."
            />
            <div className="flex flex-col gap-3">
                {[...byDiscipline.entries()].map(([key, qs]) => (
                    <div key={key} className="flex flex-col gap-1">
                        <Eyebrow>{key}</Eyebrow>
                        <div className="flex flex-wrap gap-1.5">
                            {qs.map((q) => (
                                <span
                                    key={q._id}
                                    title={q.title}
                                    className={`text-eyebrow px-1.5 py-0.5 border ${
                                        q.prestiged ? "border-nier-dark bg-nier-dark text-nier-text-light"
                                            : q.mastered ? "border-nier-dark text-nier-text-dark"
                                                : "border-nier-150 text-nier-text-dark/60"
                                    }`}
                                >
                                    {q.slug}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PatternsView = () => (
    <Placeholder
        title="Patterns"
        note="Charts over the event log — activity heatmap, mastery-over-time, recall accuracy, per-discipline levels, Logos timeline (spec §9) — drawn in the dataviz/chrome grammar. Design pass together."
    />
);

const SessionsView = () => (
    <Placeholder
        title="Sessions"
        note="Past and resumable teaching sessions with their transcripts (spec §4.3). Wired once sessions exist against the dev DB."
    />
);

export default MindWindow;
