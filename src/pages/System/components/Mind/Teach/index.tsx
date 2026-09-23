import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore, CONTINUE_MSG } from "../../../../../store/mindSession";
import { useMindGraph } from "../../../../../store/mind";
import Conversation from "./Conversation";
import Minimap from "./Minimap";
import Landscape from "./Landscape";

// The Teach view (spec §17): chat-primary with a live active-discipline minimap.
// Claude drives (opens with what's due); one-pass answering; auto-resume with a
// New session control.

const TeachView = () => {
    const { turns, status, error, sessionId, init, send, answer, newSession } = useSessionStore();
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
    const openCount = quests.filter(q => q.started && !q.mastered).length;

    // The new-session menu: a navigation choice, NOT a graded question — each
    // option just starts that kind of session via the free-text send() path, so
    // it never records an answer or touches a streak. Built from real state:
    // recalls/continue only appear when there's something to recall/continue.
    const openerOptions: { key: string; label: string; onSelect: () => void }[] = [];
    if (dueCount > 0) openerOptions.push({ key: "recalls", label: `Recalls due (${dueCount})`, onSelect: () => send("Let's do my due recalls — start with the first one.") });
    if (openCount > 0) openerOptions.push({ key: "continue", label: "Continue a topic in progress", onSelect: () => send("Let's continue one of my in-progress quests — pick the one closest to mastery and ask the next diagnostic.") });
    openerOptions.push({ key: "pick", label: "Pick a new topic for me", onSelect: () => send("Start a BRAND-NEW topic I have not begun — choose a quest with zero progress (not one already in a streak) and teach it from scratch. Do NOT continue an in-progress quest.") });
    openerOptions.push({ key: "choose", label: "Start a new topic", onSelect: () => send("I'd like to start a new topic — ask me what I want to learn, then teach it from scratch. Only networking, DevOps, and sysadmin topics are in scope; if I name something outside those, tell me and suggest a related in-scope topic instead.", { display: false }) });

    const busy = status === "sending" || status === "loading";
    const lastTurn = turns[turns.length - 1];
    const awaitingContinue = !busy && lastTurn?.role === "assistant" && (lastTurn.results?.length ?? 0) > 0 && !lastTurn.question;

    const submit = (text: string) => { if (text.trim() && !busy) { send(text); setDraft(""); } };

    return (
        <div className="flex gap-4 h-full min-h-0">
            {/* chat column */}
            <div className="flex flex-col flex-1 min-h-0">
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {status === "error" && <p className="text-label text-nier-text-dark/70 whitespace-pre-wrap">{error || "Couldn't reach the teaching API."}</p>}

                    {turns.length === 0 && status === "ready" && (
                        <div className="flex flex-col gap-1.5 items-start w-full max-w-[85%]">
                            <p className="text-label text-nier-text-dark/80">What should we focus on?</p>
                            {openerOptions.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={opt.onSelect}
                                    disabled={busy}
                                    className="w-full text-left px-3 py-2 text-label border border-nier-150 text-nier-text-dark hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <Conversation turns={turns} busy={busy} onAnswer={answer} />

                    {busy && <p className="text-label uppercase tracking-widest text-nier-text-dark/50 mt-3">computing…</p>}
                    {awaitingContinue && (
                        <button
                            onClick={() => send(CONTINUE_MSG, { display: false })}
                            className="mt-3 px-3 py-1.5 text-label uppercase tracking-widest border border-nier-150 text-nier-text-dark hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors"
                        >
                            Continue ▸
                        </button>
                    )}
                </div>

                {/* composer */}
                <div className="flex items-stretch gap-2 pt-3 border-t border-nier-150 flex-shrink-0">
                    {/* Mobile-only new-session control: the minimap column (which
                        holds the desktop "+ New session" button) is hidden below md. */}
                    <button
                        onClick={() => newSession()}
                        disabled={busy}
                        aria-label="New session"
                        className="md:hidden px-3 text-title border border-nier-150 text-nier-text-dark hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default"
                    >+</button>
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
                {activeDisciplineId && <Minimap disciplineId={activeDisciplineId} />}
                <Landscape />
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
