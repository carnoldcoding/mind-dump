import type { MindActionResult } from "../../../../../types/mind";

// The one-line card under an applied action, and the milestone banner it may
// raise. Kept out of Conversation.tsx so it can be tested on its own.

export type Milestone = { label: string; logos: number } | null;

// "next in 14 days" from a due date, or null once the quest has left the ladder.
function nextIn(due: unknown, now: number): string | null {
    if (!due) return null;
    const days = Math.max(0, Math.round((new Date(String(due)).getTime() - now) / 86_400_000));
    return `next in ${days} ${days === 1 ? "day" : "days"}`;
}

// Pull a compact, display-ready shape out of one loose action result.
export function readResult(r: MindActionResult & { error?: string }, now = Date.now()): { line: string; milestone: Milestone } | null {
    // An action the backend couldn't apply (a domain rule, a malformed field) —
    // the turn still succeeded, so show a quiet note rather than a fake ✗.
    if (r.error) return { line: `⚠ ${r.op ?? "action"} not applied (${r.error})`, milestone: null };
    const o = (r.outcome || {}) as Record<string, number | boolean>;
    const res = (r.result || {}) as Record<string, number | boolean>;
    const answerEvent = (r.events || []).find(e => e.op === "answer" || e.op === "recall");
    const correct = answerEvent?.correct ?? r.correct;

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
            const next = nextIn(o.nextRecallDue, now);
            const line = `${mark}  recall · tier ${Number(o.tierBefore ?? 0)} → ${Number(o.tierAfter ?? 0)}${next ? ` · ${next}` : ""}`;
            const milestone = o.prestiged ? { label: "PRESTIGE", logos: 0 } : null;
            return { line, milestone };
        }
        // A mastered quest that wasn't due: graded, but it counts toward nothing.
        case "practice":
            return { line: `${correct ? "✓" : "✗"}  practice · not recorded`, milestone: null };
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
