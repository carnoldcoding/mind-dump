// The Body Data collection holds two kinds of document, and they are told
// apart by an explicit flag rather than by guessing from which optional
// fields happen to be set:
//
//   Movement — the thing being tracked. Carries its own display name, tag,
//              notes, sort order and current Goal. Exists whether or not
//              anything has ever been logged against it.
//   Entry    — one dated record of a set that was actually performed.
//
// Goals used to be dated documents in this same collection, and a Movement
// used to be inferred from whatever documents mentioned its name. Both are
// gone; see the migration module and ADR-0002.

export type Goal = {
    sets: number | null;
    reps: number | null;
    weight: number | null;
};

export type Movement = {
    id?: string;
    workoutName: string;
    displayName: string;
    tag: "upper" | "lower" | null;
    notes: string;
    order: number;
    goal: Goal | null;
};

export type Entry = {
    id?: string;
    workoutName: string;
    datetime: string;
    setsCompleted?: number;
    repsCompleted?: number;
    weightUsed?: number;
};

// What the API actually returns — every field optional, ids under either key.
export type BodyDoc = {
    _id?: string;
    id?: string;
    workoutName: string;
    datetime: string;
    _meta?: boolean;
    displayName?: string;
    tag?: "upper" | "lower" | null;
    notes?: string;
    order?: number;
    goal?: Goal | null;
    setsCompleted?: number;
    repsCompleted?: number;
    weightUsed?: number;
};

const docId = (doc: BodyDoc) => doc._id ?? doc.id;

export const goalIsEmpty = (goal: Goal | null | undefined): boolean =>
    !goal || (goal.sets == null && goal.reps == null && goal.weight == null);

export function describeGoal(goal: Goal | null | undefined): string | null {
    if (goalIsEmpty(goal)) return null;
    const { sets, reps, weight } = goal!;
    const shape = sets != null && reps != null ? `${sets} × ${reps}` : sets != null ? `${sets} sets` : reps != null ? `${reps} reps` : null;
    const load = weight != null ? `${weight} lbs` : null;
    return [shape, load].filter(Boolean).join(" @ ");
}

export function describeEntry(entry: Entry): string {
    const parts: string[] = [];
    if (entry.setsCompleted != null) parts.push(`${entry.setsCompleted} sets`);
    if (entry.repsCompleted != null) parts.push(`${entry.repsCompleted} reps`);
    if (entry.weightUsed != null) parts.push(`${entry.weightUsed} lbs`);
    return parts.join(" · ");
}

export function partitionBodyDocs(docs: BodyDoc[]): { movements: Movement[]; entries: Entry[] } {
    const movements: Movement[] = [];
    const entries: Entry[] = [];

    for (const doc of docs) {
        if (doc._meta) {
            movements.push({
                id: docId(doc),
                workoutName: doc.workoutName,
                displayName: doc.displayName || doc.workoutName,
                tag: doc.tag ?? null,
                notes: doc.notes || "",
                order: doc.order ?? 9999,
                goal: goalIsEmpty(doc.goal) ? null : doc.goal!,
            });
        } else {
            entries.push({
                id: docId(doc),
                workoutName: doc.workoutName,
                datetime: doc.datetime,
                setsCompleted: doc.setsCompleted,
                repsCompleted: doc.repsCompleted,
                weightUsed: doc.weightUsed,
            });
        }
    }

    movements.sort((a, b) => a.order - b.order);
    return { movements, entries };
}
