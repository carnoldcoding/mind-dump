// The Report tab's arithmetic, one function per question a chart answers
// (spec R29–R38). Pure, over the Transactions the window already holds, so
// each chart is a view of numbers tested here rather than numbers worked out
// inside a component.
//
// Every income figure leaves out the starting balance (R29): it is the money
// already in the bank on day one, and counting it would make the first month
// look like the best-paid month on record.

import type { Transaction } from "../../../../types/finances";

/** `YYYY-MM` */
export type Month = string;

export const monthOf = (date: string): Month => date.slice(0, 7);

export function shiftMonth(month: Month, by: number): Month {
    const [y, m] = month.split("-").map(Number);
    const total = y * 12 + (m - 1) + by;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: Month): number {
    const [y, m] = month.split("-").map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** The `count` months that end with `month`, oldest first. */
export function lastMonths(month: Month, count: number): Month[] {
    return Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1));
}

const inMonth = (month: Month) => (t: Transaction) => monthOf(t.date) === month;
const isSpending = (t: Transaction) => t.kind === "spending";
const isReportIncome = (t: Transaction) => t.kind === "income" && !t.startingBalance;
const sum = (ts: Transaction[]) => ts.reduce((total, t) => total + t.amount, 0);

export type MonthTotals = {
    income: number;
    spending: number;
    net: number;
    /** Share of income kept, 0–1; null in a month with no income. */
    savingsRate: number | null;
};

export function monthTotals(transactions: Transaction[], month: Month): MonthTotals {
    const these = transactions.filter(inMonth(month));
    const income = sum(these.filter(isReportIncome));
    const spending = sum(these.filter(isSpending));
    const net = income - spending;
    return { income, spending, net, savingsRate: income > 0 ? net / income : null };
}

export function monthlySeries(transactions: Transaction[], endMonth: Month, count = 12) {
    return lastMonths(endMonth, count).map(month => ({ month, ...monthTotals(transactions, month) }));
}

/** Envelope id → cents spent from it in the month. */
export function spendingByEnvelope(transactions: Transaction[], month: Month): Map<string, number> {
    const by = new Map<string, number>();
    for (const t of transactions) {
        if (!isSpending(t) || monthOf(t.date) !== month || !t.envelopeId) continue;
        by.set(t.envelopeId, (by.get(t.envelopeId) ?? 0) + t.amount);
    }
    return by;
}

/** Spending so far at the end of each day of the month; index 0 is the 1st. */
export function cumulativeByDay(transactions: Transaction[], month: Month): number[] {
    const perDay = new Array(daysInMonth(month)).fill(0);
    for (const t of transactions) {
        if (isSpending(t) && monthOf(t.date) === month) perDay[Number(t.date.slice(8, 10)) - 1] += t.amount;
    }
    let running = 0;
    return perDay.map(n => (running += n));
}

/** Date → cents spent that day. */
export function dailySpending(transactions: Transaction[], month: Month): Map<string, number> {
    const by = new Map<string, number>();
    for (const t of transactions) {
        if (isSpending(t) && monthOf(t.date) === month) by.set(t.date, (by.get(t.date) ?? 0) + t.amount);
    }
    return by;
}

export function largest(transactions: Transaction[], month: Month, count = 10): Transaction[] {
    return transactions
        .filter(t => isSpending(t) && monthOf(t.date) === month)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, count);
}

/** Every payee used before, most used first (R21). */
export function payeeSuggestions(transactions: Transaction[]): string[] {
    const counts = new Map<string, number>();
    for (const t of transactions) if (t.payee) counts.set(t.payee, (counts.get(t.payee) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([payee]) => payee);
}

export function monthLabel(month: Month, style: "long" | "short" = "long"): string {
    const [y, m] = month.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
        month: style, year: style === "long" ? "numeric" : "2-digit", timeZone: "UTC",
    });
}
