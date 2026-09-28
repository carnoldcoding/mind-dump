import { describe, expect, it } from "vitest";
import { readResult } from "./readResult";

// The card under a graded click. A recall used to read as a full streak,
// because every click was recorded as a mastery answer.
describe("readResult", () => {
    const now = Date.parse("2026-09-28T12:00:00Z");
    const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();

    it("shows a passed recall's tier move and next due date", () => {
        const r = readResult({
            op: "recordRecall", kind: "recall", correct: true,
            outcome: { tierBefore: 2, tierAfter: 3, prestiged: false, nextRecallDue: inDays(14) },
        }, now);
        expect(r?.line).toBe("✓  recall · tier 2 → 3 · next in 14 days");
        expect(r?.milestone).toBeNull();
    });

    it("shows a failed recall moving down", () => {
        const r = readResult({
            op: "recordRecall", kind: "recall", correct: false,
            outcome: { tierBefore: 2, tierAfter: 1, nextRecallDue: inDays(3) },
        }, now);
        expect(r?.line).toBe("✗  recall · tier 2 → 1 · next in 3 days");
    });

    it("drops the due date and raises the banner on a prestige", () => {
        const r = readResult({
            op: "recordRecall", correct: true,
            outcome: { tierBefore: 4, tierAfter: 4, prestiged: true, nextRecallDue: null },
        }, now);
        expect(r?.line).toBe("✓  recall · tier 4 → 4");
        expect(r?.milestone).toEqual({ label: "PRESTIGE", logos: 0 });
    });

    it("marks practice as not recorded, with no streak", () => {
        const r = readResult({ op: "practice", kind: "practice", correct: true, events: [] }, now);
        expect(r?.line).toBe("✓  practice · not recorded");
    });

    it("keeps the streak card for a mastery answer", () => {
        const r = readResult({
            op: "recordAnswer", kind: "mastery",
            outcome: { streak: 2 },
            events: [{ op: "answer", correct: true } as never],
        }, now);
        expect(r?.line).toBe("✓  streak ●●○");
    });
});
