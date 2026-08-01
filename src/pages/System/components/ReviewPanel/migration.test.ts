import { describe, expect, it } from "vitest";
import { planDateMigration, toIsoDate } from "./migration";
import type { ReviewDoc } from "./migration";

const review = (slug: string, over: Partial<ReviewDoc> = {}): ReviewDoc => ({
    _id: `id-${slug}`,
    slug,
    title: slug,
    status: "done",
    date_completed: "01/07/2026",
    ...over,
});

describe("toIsoDate", () => {
    it("reads a US locale date as month-first", () => {
        expect(toIsoDate("01/07/2026")).toBe("2026-01-07");
    });

    // The whole reason for the canonical format: 03/04 is March 4th to the
    // editor that wrote it, and April 3rd to half the world reading it.
    it("resolves an ambiguous day/month the way the editor wrote it", () => {
        expect(toIsoDate("03/04/2026")).toBe("2026-03-04");
    });

    it("passes an ISO date through untouched", () => {
        expect(toIsoDate("2026-03-04")).toBe("2026-03-04");
    });

    it("pads single-digit months and days", () => {
        expect(toIsoDate("3/4/2026")).toBe("2026-03-04");
    });

    it("rejects a date whose month could never be a month", () => {
        expect(toIsoDate("13/01/2026")).toBeNull();
    });

    it("rejects a day the month cannot have", () => {
        expect(toIsoDate("02/30/2026")).toBeNull();
    });

    it("rejects text that is not a date at all", () => {
        expect(toIsoDate("sometime last winter")).toBeNull();
    });

    it("treats an empty value as no date", () => {
        expect(toIsoDate("")).toBeNull();
    });
});

describe("planDateMigration", () => {
    it("rewrites a US locale date to ISO", () => {
        const plan = planDateMigration([review("nioh", { date_completed: "02/12/2026" })]);

        expect(plan.rewrites).toEqual([
            { slug: "nioh", title: "nioh", from: "02/12/2026", to: "2026-02-12" },
        ]);
        expect(plan.isEmpty).toBe(false);
    });

    it("leaves a document that already carries an ISO date alone", () => {
        const plan = planDateMigration([review("doom", { date_completed: "2026-05-18" })]);

        expect(plan.rewrites).toEqual([]);
        expect(plan.isEmpty).toBe(true);
    });

    // Story 11: running it twice has to be harmless, which is only true if the
    // second run's plan is empty.
    it("is idempotent — applying its own output produces nothing to do", () => {
        const docs = [review("nioh", { date_completed: "02/12/2026" })];
        const first = planDateMigration(docs);

        const applied = docs.map(d => ({ ...d, date_completed: first.rewrites[0].to }));

        expect(planDateMigration(applied).isEmpty).toBe(true);
    });

    it("skips a document with no completion date", () => {
        const plan = planDateMigration([review("frieren", { date_completed: "" })]);

        expect(plan.rewrites).toEqual([]);
        expect(plan.skipped).toEqual([]);
        expect(plan.isEmpty).toBe(true);
    });

    it("skips a document missing the field entirely", () => {
        const plan = planDateMigration([review("silent-hill", { date_completed: undefined })]);

        expect(plan.rewrites).toEqual([]);
        expect(plan.isEmpty).toBe(true);
    });

    // The spec expected an orphaned camelCase key. No document in the
    // collection carries one, but folding it in costs nothing and means the
    // plan is right whether or not one turns up.
    it("folds a legacy camelCase key into the canonical one", () => {
        const plan = planDateMigration([
            review("hobbit", { date_completed: undefined, dateCompleted: "09/21/2026" }),
        ]);

        expect(plan.rewrites).toEqual([
            { slug: "hobbit", title: "hobbit", from: "09/21/2026", to: "2026-09-21" },
        ]);
    });

    it("prefers the canonical key when a document carries both", () => {
        const plan = planDateMigration([
            review("inception", { date_completed: "07/13/2026", dateCompleted: "01/01/2020" }),
        ]);

        expect(plan.rewrites[0].to).toBe("2026-07-13");
    });

    it("falls back to the legacy key when the canonical one is empty", () => {
        const plan = planDateMigration([
            review("the-room", { date_completed: "", dateCompleted: "09/12/2026" }),
        ]);

        expect(plan.rewrites[0].to).toBe("2026-09-12");
    });

    it("reports an unreadable date instead of guessing at it", () => {
        const plan = planDateMigration([review("babbdi", { date_completed: "13/45/2026" })]);

        expect(plan.rewrites).toEqual([]);
        expect(plan.skipped).toEqual([
            { slug: "babbdi", title: "babbdi", value: "13/45/2026", reason: "unreadable" },
        ]);
        expect(plan.isEmpty).toBe(false);
    });

    // The update endpoint matches on slug, so a document without one cannot be
    // addressed at all — saying so is more use than silently dropping it.
    it("reports a document that has no slug to write back to", () => {
        const plan = planDateMigration([review("ghost", { slug: undefined, title: "Ghost" })]);

        expect(plan.rewrites).toEqual([]);
        expect(plan.skipped).toEqual([
            { slug: "", title: "Ghost", value: "01/07/2026", reason: "no-slug" },
        ]);
    });

    it("keeps documents in the order they arrived", () => {
        const plan = planDateMigration([
            review("first", { date_completed: "01/02/2026" }),
            review("second", { date_completed: "01/03/2026" }),
            review("third", { date_completed: "01/04/2026" }),
        ]);

        expect(plan.rewrites.map(r => r.slug)).toEqual(["first", "second", "third"]);
    });

    it("plans nothing for an empty collection", () => {
        expect(planDateMigration([]).isEmpty).toBe(true);
    });
});
