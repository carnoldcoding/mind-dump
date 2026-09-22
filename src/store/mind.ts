// The one copy of the mind graph (quests + disciplines) the app keeps — same
// fetch-once, invalidate-after-write shape as the Reviews store (ADR-0005).
// Teaching turns write through the backend and then invalidate this.

import { useEffect } from "react";
import { create } from "zustand";
import { backend } from "../api/backend";
import type { MindQuest, MindDiscipline } from "../types/mind";

type Status = "idle" | "loading" | "ready" | "error";

type MindStore = {
    quests: MindQuest[];
    disciplines: MindDiscipline[];
    status: Status;
    load: () => Promise<void>;
    invalidate: () => Promise<void>;
};

let inFlight: Promise<void> | null = null;
let generation = 0;

const initialState = { quests: [] as MindQuest[], disciplines: [] as MindDiscipline[], status: "idle" as Status };

export const useMindStore = create<MindStore>((set, get) => {
    const fetchGraph = async (initial: boolean): Promise<void> => {
        const mine = ++generation;
        const run = (async () => {
            try {
                const data = await backend.getMindGraph();
                if (mine === generation) set({ quests: data.quests, disciplines: data.disciplines, status: "ready" });
            } catch {
                if (mine === generation && initial) set({ status: "error" });
            } finally {
                if (mine === generation) inFlight = null;
            }
        })();
        inFlight = run;
        return run;
    };

    return {
        ...initialState,
        load: async () => {
            if (get().status === "ready") return;
            if (inFlight) return inFlight;
            set({ status: "loading" });
            return fetchGraph(true);
        },
        invalidate: async () => fetchGraph(false),
    };
});

export function useMindGraph() {
    const quests = useMindStore(s => s.quests);
    const disciplines = useMindStore(s => s.disciplines);
    const status = useMindStore(s => s.status);
    const load = useMindStore(s => s.load);
    useEffect(() => { load(); }, [load]);
    return {
        quests,
        disciplines,
        loading: status === "idle" || status === "loading",
        error: status === "error",
    };
}

export const invalidateMind = () => useMindStore.getState().invalidate();

/** Tests only — module-level state outlives a single test. */
export function resetMindStore() {
    inFlight = null;
    generation++;
    useMindStore.setState(initialState);
}
