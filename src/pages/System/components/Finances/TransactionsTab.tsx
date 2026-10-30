import { formatCents } from "./money";
import { monthLabel, monthOf, shiftMonth, type Month } from "./report";
import { MonthPicker, NewRow, Section } from "./ui";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import type { FinanceData, Schedule, Transaction } from "../../../../types/finances";

type Props = {
    data: FinanceData;
    month: Month;
    onMonth: (m: Month) => void;
    onEditTransaction: (t: Transaction | "new") => void;
    onEditSchedule: (s: Schedule | "new") => void;
};

function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// One month of Transactions, newest first, and the Scheduled transactions
// that record themselves (R23–R25). Every row opens the full form, which is
// also where income, a past date, or a note are entered.
const TransactionsTab = ({ data, month, onMonth, onEditTransaction, onEditSchedule }: Props) => {
    const shown = data.transactions.filter(t => monthOf(t.date) === month);
    const nameOf = (id: string | null) => data.envelopes.find(e => e._id === id)?.name ?? "";

    return (
        <div className="flex flex-col gap-4">
            <Section title="Transactions">
                <ToolbarRow>
                    <MonthPicker
                        label={monthLabel(month)}
                        onPrev={() => onMonth(shiftMonth(month, -1))}
                        onNext={() => onMonth(shiftMonth(month, 1))}
                        nextDisabled={month >= monthOf(data.today)}
                    />
                </ToolbarRow>
                <div>{shown.length === 0 ? (
                    <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No Transactions this month.</p>
                ) : shown.map(t => (
                    <button
                        key={t._id}
                        onClick={() => onEditTransaction(t)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                    >
                        <span className="text-eyebrow text-nier-text-dark/50 uppercase tracking-wide shrink-0">{t.date.slice(5)}</span>
                        <span className="flex-1 min-w-0 flex flex-col">
                            <span className="text-label text-nier-text-dark truncate">
                                {t.payee || t.note || (t.kind === "income" ? "Income" : "Spending")}
                                {t.scheduleId && <span className="text-nier-text-dark/40"> · scheduled</span>}
                            </span>
                            <span className="text-eyebrow uppercase tracking-wide text-nier-text-dark/50 truncate">
                                {t.kind === "income" ? (t.startingBalance ? "Starting balance" : "Income") : nameOf(t.envelopeId)}
                            </span>
                        </span>
                        <span className="text-label tabular-nums shrink-0 text-nier-text-dark">
                            {t.kind === "income" ? "+" : "−"}{formatCents(t.amount)}
                        </span>
                    </button>
                ))}</div>
                <NewRow label="New Transaction" onClick={() => onEditTransaction("new")} />
            </Section>

            <Section title="Scheduled">
                <div>{data.schedules.length === 0 ? (
                    <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">Pay and bills that record themselves.</p>
                ) : data.schedules.map(s => (
                    <button
                        key={s._id}
                        onClick={() => onEditSchedule(s)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                    >
                        <span className="flex-1 min-w-0 flex flex-col">
                            <span className="text-label text-nier-text-dark truncate">{s.payee || "Untitled"}</span>
                            <span className="text-eyebrow uppercase tracking-wide text-nier-text-dark/50 truncate">
                                {s.days.map(ordinal).join(", ")} · {s.kind === "income" ? "Income" : nameOf(s.envelopeId)}
                            </span>
                        </span>
                        <span className="text-label tabular-nums shrink-0 text-nier-text-dark">
                            {s.kind === "income" ? "+" : "−"}{formatCents(s.amount)}
                        </span>
                    </button>
                ))}</div>
                <NewRow label="New Schedule" onClick={() => onEditSchedule("new")} />
            </Section>
        </div>
    );
};

export default TransactionsTab;
