import { describe, expect, it } from "vitest";
import { planMigration } from "./migration";
import type { LegacyDoc } from "./migration";

const meta = (workoutName: string, over: Partial<LegacyDoc> = {}): LegacyDoc => ({
    _id: `meta-${workoutName}`,
    workoutName,
    _meta: true,
    displayName: workoutName,
    tag: null,
    notes: "",
    order: 0,
    datetime: "2026-01-01T00:00:00.000Z",
    ...over,
});

const log = (workoutName: string, datetime: string, over: Partial<LegacyDoc> = {}): LegacyDoc => ({
    _id: `log-${workoutName}-${datetime}`,
    workoutName,
    datetime,
    setsCompleted: 3,
    repsCompleted: 8,
    weightUsed: 180,
    ...over,
});

const goal = (workoutName: string, datetime: string, over: Partial<LegacyDoc> = {}): LegacyDoc => ({
    _id: `goal-${workoutName}-${datetime}`,
    workoutName,
    datetime,
    setGoal: 3,
    repGoal: 8,
    weightGoal: 185,
    ...over,
});

const phantom = (workoutName: string): LegacyDoc => ({
    _id: `phantom-${workoutName}`,
    workoutName,
    datetime: "2026-01-01T00:00:00.000Z",
});

describe("planMigration", () => {
    it("plans nothing for data that is already migrated", () => {
        const plan = planMigration([
            meta("Bench Press"),
            log("Bench Press", "2026-03-01T00:00:00.000Z"),
        ]);

        expect(plan.backfill).toEqual([]);
        expect(plan.setGoal).toEqual([]);
        expect(plan.deletions).toEqual([]);
        expect(plan.isEmpty).toBe(true);
    });

    it("backfills a Movement record for a movement that has entries but none", () => {
        const plan = planMigration([log("Squat", "2026-03-01T00:00:00.000Z")]);

        expect(plan.backfill).toEqual([
            expect.objectContaining({ workoutName: "Squat", displayName: "Squat", tag: null, notes: "" }),
        ]);
    });

    it("gives backfilled Movements orders after the highest existing order", () => {
        const plan = planMigration([
            meta("Bench Press", { order: 4 }),
            log("Squat", "2026-03-01T00:00:00.000Z"),
            log("Deadlift", "2026-03-01T00:00:00.000Z"),
        ]);

        expect(plan.backfill.map(b => [b.workoutName, b.order])).toEqual([
            ["Squat", 5],
            ["Deadlift", 6],
        ]);
    });

    it("folds the most recent goal into the existing Movement record", () => {
        const plan = planMigration([
            meta("Bench Press"),
            goal("Bench Press", "2026-01-10T00:00:00.000Z", { setGoal: 5, repGoal: 5, weightGoal: 135 }),
            goal("Bench Press", "2026-03-03T00:00:00.000Z", { setGoal: 3, repGoal: 8, weightGoal: 185 }),
        ]);

        expect(plan.setGoal).toEqual([
            { id: "meta-Bench Press", workoutName: "Bench Press", goal: { sets: 3, reps: 8, weight: 185 } },
        ]);
    });

    it("folds the most recent goal into a Movement it is backfilling", () => {
        const plan = planMigration([
            log("Dips", "2026-02-01T00:00:00.000Z"),
            goal("Dips", "2026-02-20T00:00:00.000Z", { setGoal: 4, repGoal: 12, weightGoal: 25 }),
        ]);

        expect(plan.backfill).toEqual([
            expect.objectContaining({ workoutName: "Dips", goal: { sets: 4, reps: 12, weight: 25 } }),
        ]);
        expect(plan.setGoal).toEqual([]);
    });

    it("carries a partially specified goal across, leaving unset components null", () => {
        const plan = planMigration([
            meta("Plank"),
            goal("Plank", "2026-02-01T00:00:00.000Z", { setGoal: 3, repGoal: undefined, weightGoal: undefined }),
        ]);

        expect(plan.setGoal[0].goal).toEqual({ sets: 3, reps: null, weight: null });
    });

    it("deletes every goal row, including the one it folded", () => {
        const plan = planMigration([
            meta("Bench Press"),
            goal("Bench Press", "2026-01-10T00:00:00.000Z"),
            goal("Bench Press", "2026-03-03T00:00:00.000Z"),
        ]);

        expect(plan.deletions.filter(d => d.reason === "stale-goal").map(d => d.id)).toEqual([
            "goal-Bench Press-2026-03-03T00:00:00.000Z",
            "goal-Bench Press-2026-01-10T00:00:00.000Z",
        ]);
    });

    it("deletes placeholder rows that classify as nothing", () => {
        const plan = planMigration([meta("Rows"), phantom("Rows"), log("Rows", "2026-03-01T00:00:00.000Z")]);

        expect(plan.deletions).toEqual([
            { id: "phantom-Rows", workoutName: "Rows", reason: "phantom" },
        ]);
    });

    it("never deletes a logged set", () => {
        const plan = planMigration([
            meta("Bench Press"),
            log("Bench Press", "2026-03-01T00:00:00.000Z"),
            log("Bench Press", "2026-03-08T00:00:00.000Z"),
            goal("Bench Press", "2026-03-03T00:00:00.000Z"),
            phantom("Bench Press"),
        ]);

        const deletedIds = plan.deletions.map(d => d.id);
        expect(deletedIds).not.toContain("log-Bench Press-2026-03-01T00:00:00.000Z");
        expect(deletedIds).not.toContain("log-Bench Press-2026-03-08T00:00:00.000Z");
    });

    it("treats a row carrying both logged and goal values as a logged set, and keeps it", () => {
        const mixed = log("Bench Press", "2026-03-01T00:00:00.000Z", { setGoal: 5, repGoal: 5, weightGoal: 200 });
        const plan = planMigration([meta("Bench Press"), mixed]);

        expect(plan.deletions).toEqual([]);
        expect(plan.setGoal).toEqual([]);
    });

    it("leaves a Movement record that has no entries alone", () => {
        const plan = planMigration([meta("Calf Raise")]);

        expect(plan.isEmpty).toBe(true);
    });

    it("reads ids from either _id or id", () => {
        const plan = planMigration([
            { id: "alt-id", workoutName: "Rows", datetime: "2026-01-01T00:00:00.000Z" } as LegacyDoc,
            meta("Rows"),
        ]);

        expect(plan.deletions).toEqual([{ id: "alt-id", workoutName: "Rows", reason: "phantom" }]);
    });

    it("is idempotent — re-planning its own result is empty", () => {
        const docs: LegacyDoc[] = [
            meta("Bench Press"),
            log("Bench Press", "2026-03-01T00:00:00.000Z"),
            goal("Bench Press", "2026-03-03T00:00:00.000Z"),
            phantom("Bench Press"),
            log("Squat", "2026-03-02T00:00:00.000Z"),
        ];

        const first = planMigration(docs);
        const deleted = new Set(first.deletions.map(d => d.id));
        const migrated: LegacyDoc[] = docs
            .filter(d => !deleted.has((d._id ?? d.id)!))
            .map(d => (d._meta ? { ...d, goal: first.setGoal.find(g => g.id === d._id)?.goal } : d))
            .concat(first.backfill.map(b => ({ ...b, _meta: true, datetime: "2026-07-30T00:00:00.000Z" })));

        expect(planMigration(migrated).isEmpty).toBe(true);
    });
});
