import { useState } from "react";
import type { MindQuest, MindDiscipline } from "../../../../../types/mind";
import MapGraph from "./MapGraph";

// The Map tab (spec §8): two lenses over the same live graph. Graph is the
// force-directed wikilink canvas; Tree is the Domain→Discipline→Quest grouping.

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">{children}</span>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="flex flex-col"><Eyebrow>{label}</Eyebrow><span className="text-heading text-nier-text-dark">{value}</span></div>
);

// The Tree lens — the Domain/Discipline grouping, quests as state-coloured chips.
const TreeLens = ({ quests }: { quests: MindQuest[] }) => {
    const byDiscipline = new Map<string, MindQuest[]>();
    for (const q of quests) {
        const key = `${q.domain}/${q.discipline}`;
        (byDiscipline.get(key) ?? byDiscipline.set(key, []).get(key)!).push(q);
    }
    return (
        <div className="flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
            {[...byDiscipline.entries()].map(([key, qs]) => (
                <div key={key} className="flex flex-col gap-1">
                    <Eyebrow>{key}</Eyebrow>
                    <div className="flex flex-wrap gap-1.5">
                        {qs.map(q => (
                            <span
                                key={q._id}
                                title={q.title}
                                className={`text-eyebrow px-1.5 py-0.5 border ${
                                    q.prestiged ? "border-nier-dark bg-nier-dark text-nier-text-light"
                                        : q.mastered ? "border-nier-dark text-nier-text-dark"
                                            : q.started ? "border-nier-dark/60 text-nier-text-dark/80"
                                                : "border-nier-150 text-nier-text-dark/50"
                                }`}
                            >
                                {q.slug}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const LENSES: { id: "graph" | "tree"; label: string }[] = [
    { id: "graph", label: "Graph" },
    { id: "tree", label: "Tree" },
];

const MapView = ({ quests, disciplines, mastered }: { quests: MindQuest[]; disciplines: MindDiscipline[]; mastered: number }) => {
    const [lens, setLens] = useState<"graph" | "tree">("graph");
    return (
        <div className="flex flex-col gap-3 h-full min-h-0">
            <div className="flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex gap-6">
                    <Stat label="Quests" value={quests.length} />
                    <Stat label="Mastered" value={mastered} />
                    <Stat label="Disciplines" value={disciplines.length} />
                </div>
                <div className="flex border border-nier-150 self-start">
                    {LENSES.map(l => (
                        <button
                            key={l.id}
                            onClick={() => setLens(l.id)}
                            className={`px-3 py-1.5 text-eyebrow uppercase tracking-widest cursor-pointer transition-colors ${
                                lens === l.id ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark/70 hover:bg-nier-150/50"
                            }`}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 min-h-0">
                {lens === "graph" ? <MapGraph quests={quests} /> : <TreeLens quests={quests} />}
            </div>
        </div>
    );
};

export default MapView;
