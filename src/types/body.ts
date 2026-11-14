// Body — the shapes /api/body returns. Vocabulary in CONTEXT.md (Plan,
// Workout, Movement, Rule, Pair, Session, Set, Routine, Weigh-in, Phase).
// Every date is ISO YYYY-MM-DD; every weight is pounds.

export type MovementKind = "reps" | "hold";
export type Rule = "pastFailure" | "failure" | "noFailure";

export type Movement = {
    _id: string;
    name: string;
    kind: MovementKind;
    rule: Rule;
    /** How many Sets the Plan asks for. */
    sets: number;
    /** True when a Set of it also records a load. */
    loaded: boolean;
};

export type MovementInput = Omit<Movement, "_id">;

/** A Movement's place in a Workout. Two neighbours that share `pair` alternate Sets. */
export type Slot = { movementId: string; pair: number | null };

export type WorkoutKey = "upperA" | "lowerA" | "upperB" | "lowerB";

export type Workout = {
    key: WorkoutKey;
    name: string;
    /** 1 = Monday … 7 = Sunday. */
    weekday: number;
    slots: Slot[];
};

/** A Routine item is timed or counted, never both. */
export type RoutineItem = { name: string; sets: number; seconds?: number; reps?: number };

export type Phase = { name: string; startLb: number; targetLb: number };

export type Plan = {
    workouts: Workout[];
    routine: { items: RoutineItem[] };
    phase: Phase;
};

/** What a Set records depends on its Movement: seconds for a hold, reps otherwise. */
export type SetValues = {
    full?: number;
    partial?: number;
    assisted?: number;
    seconds?: number;
    load?: number;
};

export type LoggedSet = SetValues & { id: string; movementId: string };

export type Session = {
    _id: string;
    date: string;
    workoutKey: WorkoutKey;
    sets: LoggedSet[];
    /** Movements the user chose to skip in this Session. */
    skipped: string[];
};

export type WeighIn = { date: string; lb: number };

export type GridWeek = {
    weekStart: string;
    workouts: { key: WorkoutKey; name: string; weekday: number; done: boolean; date: string | null }[];
    routine: { date: string; done: boolean }[];
};

export type Point = { date: string; value: number };

export type BodySummary = {
    today: {
        date: string;
        weekday: number;
        due: WorkoutKey | null;
        dueDone: boolean;
        /** Workouts planned earlier this week that have no Session with a Set. */
        missed: WorkoutKey[];
    };
    grid: GridWeek[];
    weight: {
        latest: WeighIn | null;
        /** The Weigh-ins of the last 7 days, averaged. Null with none. */
        average: number | null;
        count: number;
        startLb: number;
        targetLb: number;
        /** Average minus start. */
        change: number | null;
    };
    bests: Record<string, { best: Point | null; series: Point[] }>;
    /** For each Movement, the Sets of its last Session before today. */
    previous: Record<string, { date: string; sets: LoggedSet[] }>;
};

export type BodyData = {
    today: string;
    /** Null until the seed has run; `summary` is null with it. */
    plan: Plan | null;
    movements: Movement[];
    sessions: Session[];
    checks: { date: string }[];
    weighins: WeighIn[];
    summary: BodySummary | null;
};
