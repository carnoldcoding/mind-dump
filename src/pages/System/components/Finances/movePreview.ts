// What the Assign / Move form shows for each end of a move: the figures the
// move changes, before and after (specs/finances-envelope-ux.md R14–R16).
// The arithmetic is the backend's (lib/finances/budget.js), applied to one
// Assignment's difference so the form can update on each keystroke.

import { monthOf } from "./report";
import type { FinanceSummary } from "../../../../types/finances";

/** An Assignment as the form holds it. A null end is Unassigned. */
export type Move = { amount: number; date: string; envelopeId: string | null; sourceEnvelopeId: string | null };

export type Span = { before: number; after: number };
/** `needed` is null for Unassigned and for an Envelope with no Target. */
export type EndPreview = { balance: Span; needed: Span | null };

// What one Assignment does to an end's balance. For Unassigned: out when it
// is the source, in when it is the destination (R19).
function balanceEffect(m: Move | null, end: string | null): number {
    if (!m) return 0;
    let n = 0;
    if (m.envelopeId === end) n += m.amount;
    if (m.sourceEnvelopeId === end) n -= m.amount;
    return n;
}

// Only money in, dated this month, counts as assigned (R21, finances R11).
function assignedEffect(m: Move | null, end: string, today: string): number {
    return m && m.envelopeId === end && monthOf(m.date) === monthOf(today) ? m.amount : 0;
}

/**
 * The preview for one end. In an edit, `old` is the Assignment as saved: the
 * summary already counts it, so only the difference moves the figures (R16).
 */
export function previewEnd(
    summary: FinanceSummary,
    today: string,
    end: string | null,
    next: Move,
    old: Move | null,
    hasTarget = true,
): EndPreview {
    const diff = balanceEffect(next, end) - balanceEffect(old, end);
    if (end === null) {
        return { balance: { before: summary.unassigned, after: summary.unassigned + diff }, needed: null };
    }
    const { balance = 0, needed = 0, gap = 0 } = summary.envelopes[end] ?? {};
    const assigned = assignedEffect(next, end, today) - assignedEffect(old, end, today);
    return {
        balance: { before: balance, after: balance + diff },
        needed: hasTarget ? { before: needed, after: Math.max(0, gap - assigned) } : null,
    };
}
