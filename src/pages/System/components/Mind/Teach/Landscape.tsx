import { useEffect, useState } from "react";
import { useMindGraph } from "../../../../../store/mind";
import { backend } from "../../../../../api/backend";
import type { MindQuest } from "../../../../../types/mind";

// The between-topics overview, shown in the right column when no discipline is
// active (the Minimap takes over once one is). A read-only snapshot of the whole
// landscape: what's in progress, how far along, and when you last worked.

// Mirrors the backend OpenQuestCap (lib/mind/constants.js): starting a NEW
// discipline is blocked once this many Quests are open (created, not mastered).
// Deepening an existing discipline is never capped.
const OPEN_QUEST_CAP = 3;

const isDue = (q: MindQuest) =>
    q.mastered && !q.prestiged && !!q.nextRecallDue && new Date(q.nextRecallDue) <= new Date();

// A compact relative age: "just now", "5m ago", "3h ago", "2d ago".
function ago(iso: string | null): string {
    if (!iso) return "never";
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0 || Number.isNaN(ms)) return "just now";
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const Row = ({ label, value, title }: { label: string; value: string; title?: string }) => (
    <div className="flex items-baseline justify-between gap-2" title={title}>
        <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">{label}</span>
        <span className="text-label text-nier-text-dark">{value}</span>
    </div>
);

const Landscape = () => {
    const { quests, disciplines } = useMindGraph();
    const [lastActive, setLastActive] = useState<string | null>(null);

    // Last activity = the newest event's timestamp (events come sorted ascending),
    // which stands in for "last session" — there's no session-list endpoint yet.
    useEffect(() => {
        let live = true;
        backend.getMindEvents()
            .then(evs => { if (live && evs.length) setLastActive(evs[evs.length - 1].t); })
            .catch(() => { /* leave as "never"; the panel still renders */ });
        return () => { live = false; };
    }, []);

    const inProgress = quests
        .filter(q => q.started && !q.mastered)
        .sort((a, b) => b.streak - a.streak);
    const masteredCount = quests.filter(q => q.mastered).length;
    const dueCount = quests.filter(isDue).length;
    // The cap counts started-but-not-mastered Quests (matches openQuests()).
    const openUnmastered = quests.filter(q => q.started && !q.mastered).length;
    const room = Math.max(0, OPEN_QUEST_CAP - openUnmastered);

    return (
        <div className="flex flex-col gap-3 p-3 border border-nier-150 bg-nier-100-lighter">
            <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark font-semibold">Landscape</span>

            {/* in-progress quests */}
            <div className="flex flex-col gap-1">
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">In progress · {inProgress.length}</span>
                {inProgress.length === 0 && <span className="text-label text-nier-text-dark/50">nothing open</span>}
                {inProgress.map(q => (
                    <div key={q._id} className="flex items-baseline justify-between gap-2" title={`${q.domain}/${q.discipline}`}>
                        <span className="text-label text-nier-text-dark truncate">◐ {q.title}</span>
                        <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60 flex-shrink-0">{q.streak}/3</span>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-1 pt-1 border-t border-nier-dark/10">
                <Row label="Mastered" value={`${masteredCount}/${quests.length}`} />
                <Row label="Disciplines" value={String(disciplines.length)} />
                <Row label="Recalls due" value={String(dueCount)} />
                <Row
                    label="New discipline"
                    value={room > 0 ? `room for ${room}` : "locked"}
                    title={room > 0
                        ? `${room} open-quest slot(s) free before the cap of ${OPEN_QUEST_CAP}.`
                        : `${openUnmastered} quests open (cap ${OPEN_QUEST_CAP}); a NEW discipline is blocked until you master some. New topics inside your existing disciplines are always allowed.`}
                />
                <Row label="Last active" value={ago(lastActive)} />
            </div>
        </div>
    );
};

export default Landscape;
