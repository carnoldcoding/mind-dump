// The active teaching session: the running conversation, plus resume/new. A
// session lives server-side (transcript, events); this holds the client view of
// the current one and remembers its id in localStorage so a reload resumes it
// (spec §17 — auto-resume, with New session).
//
// Distinct from the mind graph store (store/mind.ts): that's the whole map;
// this is one conversation. After a turn with state changes, this invalidates
// the graph store so the minimap and Map reflect the new state.

import { create } from "zustand";
import { backend } from "../api/backend";
import { invalidateMind } from "./mind";
import type { MindActionResult, MindQuestion } from "../types/mind";

const LS_KEY = "mind.sessionId";

const readStoredId = (): string | null => {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
};
const storeId = (id: string | null) => {
    try {
        if (id) localStorage.setItem(LS_KEY, id);
        else localStorage.removeItem(LS_KEY);
    } catch { /* private mode */ }
};

let seq = 0;
const nextId = () => `t${++seq}`;

/** One rendered turn in the conversation. */
export type Turn =
    | { id: string; role: "user"; text: string }
    | { id: string; role: "assistant"; say: string; question: MindQuestion | null; results: MindActionResult[] };

/** A milestone the minimap should react to (node ignite). Carries a timestamp
 *  so repeated milestones on the same quest still retrigger the animation. */
export type Milestone = { quest?: string; discipline?: string; kind: "mastered" | "boss" | "prestige"; at: number };

type Status = "idle" | "loading" | "ready" | "sending" | "error";

type SessionStore = {
    sessionId: string | null;
    turns: Turn[];
    status: Status;
    /** The last MC question awaiting an answer, or null. */
    pending: MindQuestion | null;
    /** Set on a milestone result so the minimap can ignite; consumed by it. */
    milestone: Milestone | null;
    init: () => Promise<void>;
    send: (text: string) => Promise<void>;
    newSession: () => Promise<void>;
};

// Turn a milestone out of a result, if any (mastery, boss win, prestige).
function milestoneFrom(results: MindActionResult[]): Milestone | null {
    for (const r of results) {
        const o = (r.outcome || {}) as Record<string, unknown>;
        const res = (r.result || {}) as Record<string, unknown>;
        const q = (r.quest?.slug as string) || undefined;
        const disc = (r.discipline?.slug as string) || undefined;
        if (r.op === "recordAnswer" && o.mastered && (o.logosAwarded as number) > 0) return { quest: q, discipline: disc, kind: "mastered", at: Date.now() };
        if (r.op === "attemptBoss" && res.win) return { discipline: disc, kind: "boss", at: Date.now() };
        if (r.op === "recordRecall" && o.prestiged) return { quest: q, discipline: disc, kind: "prestige", at: Date.now() };
    }
    return null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
    sessionId: null,
    turns: [],
    status: "idle",
    pending: null,
    milestone: null,

    init: async () => {
        if (get().status !== "idle") return;
        set({ status: "loading" });
        const stored = readStoredId();
        try {
            if (stored) {
                const s = await backend.getMindSession(stored);
                if (s && !s.endedAt) {
                    // Resume: past turns render as prose (interactive cards were
                    // live-only; history is text — spec §17 simplification).
                    const turns: Turn[] = (s.transcript || [])
                        .filter(m => m.role === "user" || m.role === "assistant")
                        .map(m => m.role === "user"
                            ? { id: nextId(), role: "user", text: m.content }
                            : { id: nextId(), role: "assistant", say: m.content, question: null, results: [] });
                    set({ sessionId: s._id, turns, status: "ready" });
                    return;
                }
            }
            const s = await backend.createMindSession();
            storeId(s._id);
            set({ sessionId: s._id, turns: [], status: "ready" });
        } catch {
            set({ status: "error" });
        }
    },

    send: async (text: string) => {
        const { sessionId, turns } = get();
        if (!sessionId || !text.trim()) return;
        const userTurn: Turn = { id: nextId(), role: "user", text: text.trim() };
        set({ turns: [...turns, userTurn], status: "sending", pending: null });
        try {
            const turn = await backend.sendMindMessage(sessionId, text.trim());
            const assistantTurn: Turn = {
                id: nextId(), role: "assistant",
                say: turn.say, question: turn.question ?? null, results: turn.results || [],
            };
            const ms = milestoneFrom(turn.results || []);
            set(s => ({
                turns: [...s.turns, assistantTurn],
                status: "ready",
                pending: turn.question ?? null,
                ...(ms ? { milestone: ms } : {}),
            }));
            // Any applied action may have changed the graph — refresh minimap/Map.
            if ((turn.results || []).length) invalidateMind();
        } catch {
            set({ status: "error" });
        }
    },

    newSession: async () => {
        const { sessionId } = get();
        try {
            if (sessionId) await backend.endMindSession(sessionId);
            const s = await backend.createMindSession();
            storeId(s._id);
            set({ sessionId: s._id, turns: [], status: "ready", pending: null, milestone: null });
        } catch {
            set({ status: "error" });
        }
    },
}));

/** Consume the current milestone (so it fires once). */
export const clearMilestone = () => useSessionStore.setState({ milestone: null });
