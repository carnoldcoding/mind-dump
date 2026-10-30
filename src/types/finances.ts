// Finances — the shapes /api/finances returns. Vocabulary in CONTEXT.md
// (Envelope, Unassigned, Assignment, Transaction, Target, Scheduled
// transaction). Every amount is integer cents; every date is ISO YYYY-MM-DD.

export type TargetKind = "fillTo" | "addMonthly";
export type Target = { kind: TargetKind; amount: number };

export type Envelope = {
    _id: string;
    name: string;
    sortOrder: number;
    target: Target | null;
    archived: boolean;
};

export type TransactionKind = "spending" | "income";

export type Transaction = {
    _id: string;
    date: string;
    amount: number;
    kind: TransactionKind;
    /** Set for spending, null for income — income goes to Unassigned. */
    envelopeId: string | null;
    payee: string;
    note: string;
    /** The money already in the bank on day one; left out of Report income. */
    startingBalance: boolean;
    /** Set when a Scheduled transaction recorded it. */
    scheduleId: string | null;
};

export type Assignment = {
    _id: string;
    date: string;
    amount: number;
    envelopeId: string;
    /** Null when the money came out of Unassigned. */
    sourceEnvelopeId: string | null;
};

export type Schedule = {
    _id: string;
    payee: string;
    amount: number;
    kind: TransactionKind;
    envelopeId: string | null;
    note: string;
    days: number[];
    lastRecorded: string;
};

export type FinanceSummary = {
    unassigned: number;
    envelopes: Record<string, { balance: number; needed: number }>;
};

export type FinanceData = {
    today: string;
    envelopes: Envelope[];
    /** Newest first. */
    transactions: Transaction[];
    assignments: Assignment[];
    schedules: Schedule[];
    summary: FinanceSummary;
};

export type TransactionInput = {
    date: string;
    amount: number;
    kind: TransactionKind;
    envelopeId?: string | null;
    payee?: string;
    note?: string;
    startingBalance?: boolean;
};

export type AssignmentInput = {
    date: string;
    amount: number;
    envelopeId: string;
    sourceEnvelopeId?: string | null;
};

export type ScheduleInput = {
    payee: string;
    amount: number;
    kind: TransactionKind;
    envelopeId?: string | null;
    note?: string;
    days: number[];
};
