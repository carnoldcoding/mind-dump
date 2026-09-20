import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "../../../../../store/mindSession";
import { useMindGraph } from "../../../../../store/mind";
import Conversation from "./Conversation";
import Minimap from "./Minimap";

// The Teach view (spec §17): chat-primary with a live active-discipline minimap.
// Claude drives (opens with what's due); one-pass answering; auto-resume with a
// New session control.

const TeachView = () => {
    const { turns, status, sessionId, init, send, newSession } = useSessionStore();
    const { quests } = useMindGraph();
    const [draft, setDraft] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { init(); }, [init]);

    // Auto-scroll to the newest turn.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [turns.length, status]);

    // Active discipline = the one the most recent action touched.
    const activeDisciplineId = useMemo(() => {
        for (let i = turns.length - 1; i >= 0; i--) {
            const t = turns[i];
            if (t.role !== "assistant") continue;
            for (const r of t.results || []) {
                if (r.quest?.domain && r.quest?.discipline) return `${r.quest.domain}/${r.quest.discipline}`;
                if (r.discipline?.domain && r.discipline?.slug) return `${r.discipline.domain}/${r.discipline.slug}`;
            }
        }
        return null;
    }, [turns]);

    const dueCount = quests.filter(q => q.mastered && !q.prestiged && q.nextRecallDue && new Date(q.nextRecallDue) <= new Date()).length;

    const busy = status === "sending" || status === "loading";
    const lastTurn = turns[turns.length - 1];
    const awaitingContinue = !busy && lastTurn?.role === "assistant" && (lastTurn.results?.length ?? 0) > 0 && !lastTurn.question;

    const submit = (text: string) => { if (text.trim() && !busy) { send(text); setDraft(""); } };

    return (
        <div className="flex gap-4 h-full min-h-0">
            {/* chat column */}
            <div className="flex flex-col flex-1 min-h-0">
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {status === "error" && <p className="text-label text-nier-text-dark/70">Couldn't reach the teaching API.</p>}

                    {turns.length === 0 && status === "ready" && (
                        <div className="flex flex-col gap-3 items-start">
                            <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">
                                {dueCount > 0 ? `${dueCount} recall${dueCount === 1 ? "" : "s"} due` : "nothing due"}
                            </span>
                            <button
                                onClick={() => submit("Let's begin — what's due, and what should we cover?")}
                                className="px-3 py-2 text-label uppercase tracking-widest border border-nier-150 text-nier-text-dark hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors"
                            >
                                Begin session ▸
                            </button>
                        </div>
                    )}

                    <Conversation turns={turns} busy={busy} onAnswer={submit} />

                    {busy && <p className="text-label uppercase tracking-widest text-nier-text-dark/50 mt-3">computing…</p>}
                    {awaitingContinue && (
                        <button
                            onClick={() => submit("continue")}
                            className="mt-3 px-3 py-1.5 text-label uppercase tracking-widest border border-nier-150 text-nier-text-dark hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors"
                        >
                            Continue ▸
                        </button>
                    )}
                </div>

                {/* composer */}
                <div className="flex items-stretch gap-2 pt-3 border-t border-nier-150 flex-shrink-0">
                    <input
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") submit(draft); }}
                        disabled={busy || !sessionId}
                        placeholder="Answer, or ask…"
                        className="flex-1 bg-nier-100-lighter border border-nier-150 px-3 py-2 text-body text-nier-text-dark placeholder:text-nier-text-dark/40 outline-none focus:border-nier-dark transition-colors"
                    />
                    <button
                        onClick={() => submit(draft)}
                        disabled={busy || !draft.trim()}
                        className="px-4 text-label uppercase tracking-widest bg-nier-dark text-nier-text-light disabled:opacity-35 cursor-pointer disabled:cursor-default"
                    >Send</button>
                </div>
            </div>

            {/* minimap column */}
            <div className="w-56 flex-shrink-0 flex flex-col gap-3 hidden md:flex">
                <Minimap disciplineId={activeDisciplineId} />
                <button
                    onClick={() => newSession()}
                    disabled={busy}
                    className="px-3 py-1.5 text-eyebrow uppercase tracking-widest border border-nier-150 text-nier-text-dark/70 hover:bg-nier-150/50 cursor-pointer transition-colors disabled:opacity-35"
                >+ New session</button>
            </div>
        </div>
    );
};

export default TeachView;
