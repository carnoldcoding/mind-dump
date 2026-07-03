// A Body Data document is one flat shape covering three different meanings,
// distinguished only by which optional fields happen to be set (see
// CONTEXT.md's note on the Entry model). classifyEntry is the one place
// that reads those fields to answer "what is this row" — every caller asks
// it instead of re-deriving the same field-presence checks.
export type EntryKind = "meta" | "goal" | "log";

type ClassifiableEntry = {
    _meta?: boolean;
    weightUsed?: number;
    repsCompleted?: number;
    setsCompleted?: number;
    weightGoal?: number;
    repGoal?: number;
    setGoal?: number;
};

function hasGoalFields(entry: ClassifiableEntry): boolean {
    return entry.weightGoal != null || entry.repGoal != null || entry.setGoal != null;
}

function hasLogFields(entry: ClassifiableEntry): boolean {
    return entry.weightUsed != null || entry.repsCompleted != null || entry.setsCompleted != null;
}

// Precedence matches the pre-existing behaviour scattered across callers:
// meta beats goal beats log. Returns null for a row with none of these
// fields set (there's nothing to classify it as).
export function classifyEntry(entry: ClassifiableEntry): EntryKind | null {
    if (entry._meta) return "meta";
    if (hasGoalFields(entry)) return "goal";
    if (hasLogFields(entry)) return "log";
    return null;
}
