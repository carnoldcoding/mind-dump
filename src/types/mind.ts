// Types for the "mind" learning feature (spec §3, §4). Loose like the rest of
// this app's types — these name the fields the surfaces rely on and let the
// backend's shape through, rather than claiming an accuracy src/types can't.

/** One learning concept — the unified node. Progress + prose + edges. */
export type MindQuest = {
    _id: string; // "<domain>/<discipline>/<slug>"
    slug: string;
    domain: string;
    discipline: string;
    title: string;
    streak: number;
    /** True once the quest has had a recorded answer (vs. an untouched seed). */
    started?: boolean;
    mastered: boolean;
    masteredAt?: string | null;
    recallTier: number; // -1 until mastered, then 0..4
    nextRecallDue?: string | null;
    prestiged: boolean;
    lore?: string | null;
    links: string[]; // edges → other quest slugs
    [key: string]: unknown;
};

export type MindDiscipline = {
    _id: string; // "<domain>/<discipline>"
    domain: string;
    slug: string;
    title: string;
    logos: number;
    questsSinceBoss: number;
    bloodstain?: { amount: number } | null;
    [key: string]: unknown;
};

/** One immutable fact in the event log (spec §4.2). */
export type MindEvent = {
    _id?: string;
    t: string;
    sessionId?: string | null;
    op: string; // answer | mastered | recall | prestige | boss | startQuest | loreEdit | linkEdit | sessionStart | sessionEnd
    domain?: string;
    discipline?: string;
    quest?: string;
    correct?: boolean;
    won?: boolean;
    logosDelta?: number;
    bloodstainRecovered?: number;
    tierBefore?: number;
    tierAfter?: number;
    meta?: Record<string, unknown>;
    [key: string]: unknown;
};

export type MindSession = {
    _id: string;
    startedAt: string;
    endedAt?: string | null;
    questsTouched: string[];
    transcript: { role: "user" | "assistant" | "system"; content: string; t: string }[];
    summary?: string | null;
    [key: string]: unknown;
};

/** The authoritative view the backend returns after applying an action. */
export type MindActionResult = {
    op?: string;
    outcome?: Record<string, unknown>;
    result?: Record<string, unknown>;
    quest?: Partial<MindQuest> | null;
    discipline?: Partial<MindDiscipline> | null;
    /** The event(s) appended by this action — carries `correct` for answer/recall. */
    events?: MindEvent[];
};

/** A multiple-choice diagnostic, rendered as clickable cards (spec §17). */
export type MindQuestion = {
    stem: string;
    options: { id: string; text: string }[];
};

/** One teaching turn's response (spec §6, §17): prose, an optional MC question,
 *  and the authoritative results of any applied actions. */
export type MindTurn = {
    say: string;
    question?: MindQuestion | null;
    results: MindActionResult[];
};
