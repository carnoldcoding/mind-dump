import { describe, expect, it } from "vitest";
import { previewEnd, type Move } from "./movePreview";
import type { FinanceSummary } from "../../../../types/finances";

// What the Assign / Move cards show (specs/finances-envelope-ux.md R14–R16).
// Figures are the user's own budget on 2026-11-02, in cents.
const summary: FinanceSummary = {
    unassigned: 0,
    envelopes: {
        savings: { balance: 1490000, needed: 0, gap: 0 },
        // Subscriptions after its Target went from $70 to $170.
        subs: { balance: 7000, needed: 10000, gap: 10000 },
        // Food over-funded: fillTo $500, $550 assigned in November.
        food: { balance: 55000, needed: 0, gap: -5000 },
    },
};
const today = "2026-11-02";
const move = (amount: number, envelopeId: string | null, sourceEnvelopeId: string | null, date = today): Move =>
    ({ amount, envelopeId, sourceEnvelopeId, date });

describe("previewEnd", () => {
    // A12: Savings → Subscriptions, $100.
    it("shows both balances and the destination's needed amount before and after", () => {
        const next = move(10000, "subs", "savings");
        expect(previewEnd(summary, today, "savings", next, null, false)).toEqual({
            balance: { before: 1490000, after: 1480000 },
            needed: null,
        });
        expect(previewEnd(summary, today, "subs", next, null)).toEqual({
            balance: { before: 7000, after: 17000 },
            needed: { before: 10000, after: 0 },
        });
    });

    it("shows Unassigned before and after when it is an end (R15)", () => {
        expect(previewEnd({ ...summary, unassigned: 50000 }, today, null, move(10000, "subs", null), null))
            .toEqual({ balance: { before: 50000, after: 40000 }, needed: null });
        // A15: $100 from Savings back to Unassigned.
        expect(previewEnd(summary, today, null, move(10000, null, "savings"), null))
            .toEqual({ balance: { before: 0, after: 10000 }, needed: null });
    });

    // A13: an edit from $100 to $150 changes the figures by $50 only.
    it("counts only the difference from the old amount in an edit (R16)", () => {
        const after = { ...summary, envelopes: { ...summary.envelopes, subs: { balance: 17000, needed: 0, gap: 0 } } };
        const old = move(10000, "subs", "savings");
        expect(previewEnd(after, today, "subs", move(15000, "subs", "savings"), old)).toEqual({
            balance: { before: 17000, after: 22000 },
            needed: { before: 0, after: 0 },
        });
    });

    it("uses the gap, so a cut to an over-funded Envelope eats its surplus first", () => {
        const old = move(55000, "food", null);
        expect(previewEnd(summary, today, "food", move(40000, "food", null), old)).toEqual({
            balance: { before: 55000, after: 40000 },
            needed: { before: 0, after: 10000 },
        });
    });

    // A16 / R21: a move out does not raise what an Envelope needs.
    it("leaves needed unchanged for the source of a move", () => {
        expect(previewEnd(summary, today, "food", move(5000, null, "food"), null).needed).toEqual({ before: 0, after: 0 });
    });

    it("does not count an Assignment dated in another month toward this month's needed", () => {
        expect(previewEnd(summary, today, "subs", move(10000, "subs", "savings", "2026-10-30"), null).needed)
            .toEqual({ before: 10000, after: 10000 });
    });

    it("reports no needed figure for an Envelope with no Target", () => {
        expect(previewEnd(summary, today, "savings", move(1, "subs", "savings"), null, false).needed).toBeNull();
    });
});
