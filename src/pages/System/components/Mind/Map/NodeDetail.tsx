import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { backend } from "../../../../../api/backend";
import type { MindQuest, MindEvent } from "../../../../../types/mind";

// The Map's node-detail panel (spec §8), modelled on Grimoire's right-hand
// detail: Overview / Chronicle / Lore tabs over a scroll area. Read-only.

// Mirrors the backend RecallLadderDays (lib/mind/constants.js): spacing in days
// of the recall ladder; passing the last tier prestiges the quest.
const RECALL_LADDER_DAYS = [1, 3, 7, 14, 30];

type Tab = "overview" | "chronicle" | "lore";

function ago(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
// "in 3d", "today", or "overdue 2d" for a recall due date.
function countdown(iso: string): string {
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
    if (days === 0) return "today";
    return days > 0 ? `in ${days}d` : `overdue ${-days}d`;
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/55">{children}</span>
);

// One chronicle line per event, newest first.
function eventLine(e: MindEvent): string | null {
    switch (e.op) {
        case "answer": return `${e.correct ? "✓" : "✗"}  answer`;
        case "recall": return `${e.correct ? "✓" : "✗"}  recall · tier ${(e.tierAfter ?? 0) + 1}`;
        case "mastered": return `●  mastered${e.logosDelta ? ` · +${e.logosDelta} Λ` : ""}`;
        case "prestige": return "✦  prestiged";
        case "boss": return `boss · ${e.won ? "won" : "lost"}${e.logosDelta != null ? ` · ${e.logosDelta >= 0 ? "+" : ""}${e.logosDelta} Λ` : ""}`;
        case "startQuest": return "▸  started";
        default: return null;
    }
}

const Overview = ({ quest, bySlug, onSelect }: { quest: MindQuest; bySlug: Map<string, MindQuest>; onSelect: (slug: string) => void }) => {
    const rows: [string, string][] = [];
    if (quest.prestiged) {
        rows.push(["Status", "✦ prestiged"]);
    } else if (quest.mastered) {
        const tier = quest.recallTier ?? 0;
        rows.push(["Status", "✓ mastered"]);
        if (quest.masteredAt) rows.push(["Mastered", new Date(quest.masteredAt).toISOString().slice(0, 10)]);
        rows.push(["Recall", `tier ${tier + 1} of ${RECALL_LADDER_DAYS.length}`]);
        rows.push(["Interval", `every ${RECALL_LADDER_DAYS[Math.min(tier, RECALL_LADDER_DAYS.length - 1)]} days`]);
        if (quest.nextRecallDue) rows.push(["Next due", `${new Date(quest.nextRecallDue).toISOString().slice(0, 10)} (${countdown(quest.nextRecallDue)})`]);
    } else if (quest.started) {
        const s = quest.streak;
        rows.push(["Status", "in progress"]);
        rows.push(["Streak", `${"●".repeat(s)}${"○".repeat(Math.max(0, 3 - s))}  ${s}/3 to mastery`]);
    } else {
        rows.push(["Status", "not started"]);
    }

    const related = (quest.links || []).map(slug => ({ slug, q: bySlug.get(slug) })).filter(r => r.q);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2">
                        <Eyebrow>{k}</Eyebrow>
                        <span className="text-label text-nier-text-dark text-right">{v}</span>
                    </div>
                ))}
            </div>
            {related.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-nier-dark/10">
                    <Eyebrow>Related</Eyebrow>
                    <div className="flex flex-wrap gap-1.5">
                        {related.map(({ slug, q }) => (
                            <button
                                key={slug}
                                onClick={() => onSelect(slug)}
                                className="text-eyebrow px-1.5 py-0.5 border border-nier-150 text-nier-text-dark/80 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors"
                            >
                                {q!.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Chronicle = ({ slug }: { slug: string }) => {
    const [events, setEvents] = useState<MindEvent[] | null>(null);
    useEffect(() => {
        let live = true;
        setEvents(null);
        backend.getMindEvents({ quest: slug })
            .then(evs => { if (live) setEvents(evs); })
            .catch(() => { if (live) setEvents([]); });
        return () => { live = false; };
    }, [slug]);

    if (events === null) return <p className="text-label text-nier-text-dark/50">Loading…</p>;
    const lines = [...events].reverse().map(e => ({ e, line: eventLine(e) })).filter(x => x.line);
    if (lines.length === 0) return <p className="text-label text-nier-text-dark/50">No history yet.</p>;
    return (
        <div className="flex flex-col gap-1.5">
            {lines.map(({ e, line }, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2">
                    <span className="text-label uppercase tracking-wider text-nier-text-dark/80">{line}</span>
                    <span className="text-eyebrow text-nier-text-dark/45 flex-shrink-0">{ago(e.t)}</span>
                </div>
            ))}
        </div>
    );
};

const Lore = ({ quest, bySlug, onSelect }: { quest: MindQuest; bySlug: Map<string, MindQuest>; onSelect: (slug: string) => void }) => {
    // Turn [[slug]] wikilinks into markdown links the renderer can make clickable,
    // labelling each with the target's title when it resolves.
    const md = useMemo(() => (quest.lore || "").replace(/\[\[([^\]]+)\]\]/g, (_, slug) => {
        const t = bySlug.get(slug);
        return `[${t ? t.title : slug}](#q/${slug})`;
    }), [quest.lore, bySlug]);

    if (!quest.lore) return <p className="text-label text-nier-text-dark/50">No lore yet.</p>;
    return (
        <div className="text-label text-nier-text-dark/85">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <h1 className="text-label font-semibold uppercase tracking-widest text-nier-text-dark mt-3 mb-1 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-eyebrow uppercase tracking-widest text-nier-text-dark/70 mt-3 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60 mt-2 mb-0.5">{children}</h3>,
                    p: ({ children }) => <p className="my-1.5 leading-snug">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 flex flex-col gap-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 flex flex-col gap-0.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-nier-text-dark">{children}</strong>,
                    pre: ({ children }) => <pre className="bg-nier-dark text-nier-text-light p-2 my-2 overflow-x-auto text-eyebrow leading-snug">{children}</pre>,
                    code: ({ children }) => <code className="font-mono text-[0.95em]">{children}</code>,
                    a: ({ href, children }) => href?.startsWith("#q/")
                        ? <button onClick={() => onSelect(href.slice(3))} className="text-nier-text-dark underline decoration-dotted underline-offset-2 hover:decoration-solid cursor-pointer">{children}</button>
                        : <a href={href} target="_blank" rel="noreferrer" className="underline">{children}</a>,
                }}
            >{md}</ReactMarkdown>
        </div>
    );
};

const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "chronicle", label: "Chronicle" },
    { id: "lore", label: "Lore" },
];

const NodeDetail = ({ quest, quests, onSelect, onClose }: { quest: MindQuest; quests: MindQuest[]; onSelect: (slug: string) => void; onClose: () => void }) => {
    const [tab, setTab] = useState<Tab>("overview");
    const bySlug = useMemo(() => new Map(quests.map(q => [q.slug, q])), [quests]);

    return (
        <div className="w-80 flex-shrink-0 flex flex-col min-h-0 border border-nier-150 bg-nier-100-lighter">
            {/* header */}
            <div className="flex items-start justify-between gap-2 p-3 border-b border-nier-150 flex-shrink-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-label text-nier-text-dark font-semibold truncate">{quest.title}</span>
                    <Eyebrow>{quest.domain} / {quest.discipline}</Eyebrow>
                </div>
                <button onClick={onClose} className="text-label text-nier-text-dark/50 hover:text-nier-text-dark cursor-pointer flex-shrink-0">✕</button>
            </div>
            {/* tab strip */}
            <div className="flex items-stretch border-b border-nier-150 flex-shrink-0">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-3 py-1.5 text-eyebrow uppercase tracking-widest cursor-pointer transition-colors ${
                            tab === t.id ? "bg-nier-dark text-nier-text-light" : "text-nier-text-dark/60 hover:bg-nier-150/50"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {/* body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
                {tab === "overview" && <Overview quest={quest} bySlug={bySlug} onSelect={onSelect} />}
                {tab === "chronicle" && <Chronicle slug={quest.slug} />}
                {tab === "lore" && <Lore quest={quest} bySlug={bySlug} onSelect={onSelect} />}
            </div>
        </div>
    );
};

export default NodeDetail;
