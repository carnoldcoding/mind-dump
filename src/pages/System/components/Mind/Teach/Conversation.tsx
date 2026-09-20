import { useRef } from "react";
import { useRevealTimeline } from "../../../../../hooks/useRevealTimeline";
import { fade, growth, decode } from "../../../../../utils/motion";
import type { Turn } from "../../../../../store/mindSession";
import type { MindActionResult } from "../../../../../types/mind";

// The teaching conversation (spec §17): prose, clickable MC cards, and the
// tiered result — compact per answer, escalating to a Decode banner + Growth
// Logos bar on Mastery/Boss/Prestige. Entrances use the app's motion primitives;
// hover/selection is CSS.

type Milestone = { label: string; logos: number } | null;

// Pull a compact, display-ready shape out of one loose action result.
function readResult(r: MindActionResult & { error?: string }): { line: string; milestone: Milestone } | null {
    // An action the backend couldn't apply (a domain rule, a malformed field) —
    // the turn still succeeded, so show a quiet note rather than a fake ✗.
    if (r.error) return { line: `⚠ ${r.op ?? "action"} not applied (${r.error})`, milestone: null };
    const o = (r.outcome || {}) as Record<string, number | boolean>;
    const res = (r.result || {}) as Record<string, number | boolean>;
    const answerEvent = (r.events || []).find(e => e.op === "answer" || e.op === "recall");
    const correct = answerEvent?.correct;

    switch (r.op) {
        case "recordAnswer": {
            const streak = Number(o.streak ?? 0);
            const dots = `${"●".repeat(streak)}${"○".repeat(Math.max(0, 3 - streak))}`;
            const mark = correct ? "✓" : "✗";
            const line = `${mark}  streak ${dots}`;
            const milestone = o.logosAwarded && Number(o.logosAwarded) > 0
                ? { label: "MASTERED", logos: Number(o.logosAwarded) }
                : null;
            return { line, milestone };
        }
        case "recordRecall": {
            const mark = correct ? "✓" : "✗";
            const tier = Number(o.tierAfter ?? 0);
            const line = `${mark}  recall · tier ${tier}`;
            const milestone = o.prestiged ? { label: "PRESTIGE", logos: 0 } : null;
            return { line, milestone };
        }
        case "attemptBoss": {
            const win = !!res.win;
            const delta = Number(res.logosDelta ?? 0);
            return {
                line: `boss · ${delta >= 0 ? "+" : ""}${delta} Λ`,
                milestone: { label: win ? "BOSS DEFEATED" : "BOSS LOST", logos: delta },
            };
        }
        case "startQuest":
            return { line: `▸ started: ${r.quest?.title ?? r.quest?.slug ?? ""}`, milestone: null };
        case "upsertLore":
            return { line: "▸ lore updated", milestone: null };
        case "linkQuests":
            return { line: "▸ links added", milestone: null };
        default:
            return null;
    }
}

const UserTurn = ({ text }: { text: string }) => {
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, tl => fade(tl, "[data-fade]"), scope);
    return (
        <div ref={scope} className="flex justify-end">
            <div data-fade className="max-w-[80%] bg-nier-dark text-nier-text-light px-3 py-2 text-body">
                {text}
            </div>
        </div>
    );
};

const AssistantTurn = ({ turn, active, busy, onAnswer }: { turn: Extract<Turn, { role: "assistant" }>; active: boolean; busy: boolean; onAnswer: (t: string) => void }) => {
    const clickable = active && !busy;
    const scope = useRef<HTMLDivElement>(null);
    const results = (turn.results || []).map(readResult).filter(Boolean) as { line: string; milestone: Milestone }[];
    const milestone = results.map(r => r.milestone).find(Boolean) || null;

    useRevealTimeline(true, tl => {
        fade(tl, "[data-fade]");
        if (scope.current?.querySelector("[data-decode]")) decode(tl, "[data-decode]", milestone!.label, "<0.1");
        if (scope.current?.querySelector("[data-logosbar]")) growth(tl, "[data-logosbar]", "<");
    }, scope, [turn.id]);

    return (
        <div ref={scope} className="flex flex-col gap-2">
            {turn.say && <p data-fade className="text-body text-nier-text-dark whitespace-pre-wrap">{turn.say}</p>}

            {/* MC question — clickable only on the active (latest) turn. */}
            {turn.question && (
                <div data-fade className="flex flex-col gap-1.5">
                    {turn.question.stem && <p className="text-label text-nier-text-dark/80">{turn.question.stem}</p>}
                    {turn.question.options.map(opt => (
                        <button
                            key={opt.id}
                            disabled={!clickable}
                            onClick={() => onAnswer(`${opt.id}. ${opt.text}`)}
                            className={`text-left px-3 py-2 text-label border transition-colors ${
                                clickable
                                    ? "border-nier-150 text-nier-text-dark hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
                                    : "border-nier-150/50 text-nier-text-dark/40 cursor-default"
                            }`}
                        >
                            <span className="uppercase tracking-widest mr-2">{opt.id}</span>{opt.text}
                        </button>
                    ))}
                </div>
            )}

            {/* Compact results */}
            {results.length > 0 && (
                <div data-fade className="flex flex-col gap-0.5">
                    {results.map((r, i) => (
                        <span key={i} className="text-label uppercase tracking-wider text-nier-text-dark/80">{r.line}</span>
                    ))}
                </div>
            )}

            {/* Milestone ceremony — Decode banner + Growth Logos bar */}
            {milestone && (
                <div className="flex flex-col gap-1 py-1">
                    <span data-decode className="text-heading uppercase tracking-widest text-nier-text-dark font-semibold">{milestone.label}</span>
                    {milestone.logos > 0 && (
                        <div className="flex items-center gap-2">
                            <div data-logosbar className="h-1.5 bg-nier-dark" style={{ width: "6rem", transformOrigin: "left center" }} />
                            <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/70">+{milestone.logos} Λ</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Conversation = ({ turns, busy, onAnswer }: { turns: Turn[]; busy: boolean; onAnswer: (t: string) => void }) => {
    const lastAssistantId = [...turns].reverse().find(t => t.role === "assistant")?.id;
    return (
        <div className="flex flex-col gap-4">
            {turns.map(t =>
                t.role === "user"
                    ? <UserTurn key={t.id} text={t.text} />
                    : <AssistantTurn key={t.id} turn={t} active={t.id === lastAssistantId} busy={busy} onAnswer={onAnswer} />
            )}
        </div>
    );
};

export default Conversation;
