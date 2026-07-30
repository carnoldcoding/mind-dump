// Derives the one-time migration from the legacy Body Data shapes to the
// current model: Movement as a stored record carrying its own Goal, Entry as
// nothing but a logged set.
//
// This is a pure function on purpose. The script that runs it prints the plan
// and does nothing else unless told to apply it, so the irreversible part of
// the migration is reviewable before it happens.

export type Goal = {
    sets: number | null;
    reps: number | null;
    weight: number | null;
};

export type LegacyDoc = {
    _id?: string;
    id?: string;
    workoutName: string;
    datetime: string;
    // Movement record
    _meta?: boolean;
    displayName?: string;
    tag?: "upper" | "lower" | null;
    notes?: string;
    order?: number;
    goal?: Goal | null;
    // Logged set
    weightUsed?: number;
    repsCompleted?: number;
    setsCompleted?: number;
    // Legacy dated goal
    weightGoal?: number;
    repGoal?: number;
    setGoal?: number;
};

export type BackfillAction = {
    workoutName: string;
    displayName: string;
    tag: null;
    notes: string;
    order: number;
    goal: Goal | null;
};

export type SetGoalAction = {
    id: string;
    workoutName: string;
    goal: Goal;
};

export type DeleteAction = {
    id: string;
    workoutName: string;
    reason: "stale-goal" | "phantom";
};

export type MigrationPlan = {
    backfill: BackfillAction[];
    setGoal: SetGoalAction[];
    deletions: DeleteAction[];
    isEmpty: boolean;
};

type LegacyKind = "movement" | "log" | "goal" | "phantom";

const docId = (doc: LegacyDoc): string | undefined => doc._id ?? doc.id;

const hasLogValues = (doc: LegacyDoc): boolean =>
    doc.weightUsed != null || doc.repsCompleted != null || doc.setsCompleted != null;

const hasGoalValues = (doc: LegacyDoc): boolean =>
    doc.weightGoal != null || doc.repGoal != null || doc.setGoal != null;

// Deliberately not the same precedence the app's own classifier used. That one
// ranked goal above log, which would mean a row carrying both kinds of values
// got read as a goal — and goals get deleted here. A logged set is the only
// thing in this collection that can't be reconstructed, so anything bearing
// logged values is a log, whatever else it also carries.
function classifyLegacy(doc: LegacyDoc): LegacyKind {
    if (doc._meta) return "movement";
    if (hasLogValues(doc)) return "log";
    if (hasGoalValues(doc)) return "goal";
    return "phantom";
}

const toGoal = (doc: LegacyDoc): Goal => ({
    sets: doc.setGoal ?? null,
    reps: doc.repGoal ?? null,
    weight: doc.weightGoal ?? null,
});

const newestFirst = (a: LegacyDoc, b: LegacyDoc) =>
    new Date(b.datetime).getTime() - new Date(a.datetime).getTime();

export function planMigration(docs: LegacyDoc[]): MigrationPlan {
    const backfill: BackfillAction[] = [];
    const setGoal: SetGoalAction[] = [];
    const deletions: DeleteAction[] = [];

    // First appearance order, so a plan reads in the same order as the data.
    const names: string[] = [];
    const byName = new Map<string, LegacyDoc[]>();
    for (const doc of docs) {
        if (!byName.has(doc.workoutName)) {
            byName.set(doc.workoutName, []);
            names.push(doc.workoutName);
        }
        byName.get(doc.workoutName)!.push(doc);
    }

    const existingOrders = docs
        .filter(d => classifyLegacy(d) === "movement")
        .map(d => d.order)
        .filter((o): o is number => typeof o === "number");
    let nextOrder = existingOrders.length ? Math.max(...existingOrders) + 1 : 0;

    for (const name of names) {
        const group = byName.get(name)!;
        const movement = group.find(d => classifyLegacy(d) === "movement");
        const goals = group.filter(d => classifyLegacy(d) === "goal").sort(newestFirst);
        const phantoms = group.filter(d => classifyLegacy(d) === "phantom");
        const survivingGoal = goals.length ? toGoal(goals[0]) : null;

        if (!movement) {
            backfill.push({
                workoutName: name,
                displayName: name,
                tag: null,
                notes: "",
                order: nextOrder++,
                goal: survivingGoal,
            });
        } else if (survivingGoal) {
            const id = docId(movement);
            if (id) setGoal.push({ id, workoutName: name, goal: survivingGoal });
        }

        for (const doc of [...goals, ...phantoms]) {
            const id = docId(doc);
            if (!id) continue;
            deletions.push({
                id,
                workoutName: name,
                reason: classifyLegacy(doc) === "goal" ? "stale-goal" : "phantom",
            });
        }
    }

    return {
        backfill,
        setGoal,
        deletions,
        isEmpty: backfill.length === 0 && setGoal.length === 0 && deletions.length === 0,
    };
}
