import { useState } from "react";
import { DateField } from "../../../../components/common/DateField";
import { backend } from "../../../../api/backend";
import { centsToInput, describeTarget, formatCents, parseDollars, todayIso } from "./money";
import { previewEnd, type Move, type Span } from "./movePreview";
import { EditorModal, EnvelopeSelect, ErrorLine, MoneyField, primaryBtn, secondaryBtn } from "./ui";
import { errorText } from "./errorText";
import type { Assignment, Envelope, FinanceSummary } from "../../../../types/finances";

type Props = {
    open: boolean;
    /** The Assignment being edited, or null to make a new one. */
    assignment: Assignment | null;
    envelopes: Envelope[];
    summary: FinanceSummary;
    today: string;
    onClose: () => void;
    onSaved: () => void;
};

// One form for every way money moves: out of Unassigned into an Envelope
// (finances R15), from one Envelope to another (finances R16), or from an
// Envelope back to Unassigned (envelope-ux R18). An empty dropdown is
// Unassigned. The backend refuses a new Assignment out of Unassigned that is
// larger than it; an edit is not capped (finances R12).
//
// Each end gets a card of the figures the move changes, before and after, so
// the Envelope tab is not needed to decide an amount (envelope-ux R14–R17).
const AssignModal = ({ open, assignment, envelopes, summary, today, onClose, onSaved }: Props) => {
    const [amount, setAmount] = useState(assignment ? centsToInput(assignment.amount) : "");
    const [from, setFrom] = useState(assignment?.sourceEnvelopeId ?? "");
    const [to, setTo] = useState(assignment?.envelopeId ?? "");
    const [date, setDate] = useState(assignment?.date ?? todayIso());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const cents = parseDollars(amount);
        if (cents == null) { setError("Enter an amount"); return; }
        if (!to && !from) { setError("Pick an Envelope for one end"); return; }

        setSaving(true);
        setError("");
        const payload = { date, amount: cents, envelopeId: to || null, sourceEnvelopeId: from || null };
        try {
            if (assignment) await backend.updateFinanceAssignment(assignment._id, payload);
            else await backend.addFinanceAssignment(payload);
            onSaved();
            onClose();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!assignment) return;
        try {
            await backend.removeFinanceAssignment(assignment._id);
            onSaved();
            onClose();
        } catch (e) {
            setError(errorText(e));
        }
    };

    const optionLabel = (e: Envelope) => {
        const { balance = 0, needed = 0 } = summary.envelopes[e._id] ?? {};
        return `${e.name} — ${formatCents(balance)}${e.target ? ` · needs ${formatCents(needed)}` : ""}`;
    };
    const noneLabel = `Unassigned — ${formatCents(summary.unassigned)}`;

    // An amount not yet typed, or not yet valid, moves nothing.
    const next: Move = { amount: parseDollars(amount) ?? 0, date, envelopeId: to || null, sourceEnvelopeId: from || null };
    const old: Move | null = assignment
        ? { amount: assignment.amount, date: assignment.date, envelopeId: assignment.envelopeId, sourceEnvelopeId: assignment.sourceEnvelopeId }
        : null;
    const card = (end: string, testId: string) => {
        const envelope = envelopes.find(e => e._id === end) ?? null;
        const preview = previewEnd(summary, today, end || null, next, old, !!envelope?.target);
        return <EndCard testId={testId} envelope={envelope} balance={preview.balance} needed={preview.needed} />;
    };

    return (
        <EditorModal open={open} title={assignment ? "Edit Assignment" : "Assign / Move"} onClose={onClose}>
            <EnvelopeSelect
                label="From"
                envelopes={envelopes.filter(e => e._id !== to)}
                value={from}
                onChange={setFrom}
                noneLabel={noneLabel}
                optionLabel={optionLabel}
            />
            {card(from, "card-from")}
            <EnvelopeSelect
                label="To"
                envelopes={envelopes.filter(e => e._id !== from)}
                value={to}
                onChange={setTo}
                noneLabel={noneLabel}
                optionLabel={optionLabel}
            />
            {card(to, "card-to")}
            <MoneyField label="Amount $" value={amount} onChange={setAmount} />
            <DateField label="Date" value={date} onChange={setDate} />

            <ErrorLine error={error} />

            <div className="flex justify-between gap-2 pt-1">
                {assignment ? <button onClick={handleDelete} className={secondaryBtn}>Delete</button> : <span />}
                <div className="flex gap-2">
                    <button onClick={onClose} className={secondaryBtn}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} className={primaryBtn}>{saving ? "…" : "Save"}</button>
                </div>
            </div>
        </EditorModal>
    );
};

// One end of the move. A figure the move changes reads "before → after"; the
// after figure is in the error color below $0 (R17). A null envelope is
// Unassigned, which has a balance only.
const EndCard = ({ testId, envelope, balance, needed }: {
    testId: string;
    envelope: Envelope | null;
    balance: Span;
    needed: Span | null;
}) => (
    <dl data-testid={testId} className="-mt-2 border border-t-0 border-nier-150 bg-nier-150/20 px-3 py-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label">
        <dt className="text-nier-text-dark/60">{envelope ? "Balance" : "Unassigned"}</dt>
        <SpanCell testId="balance" span={balance} />
        {envelope && (
            <>
                <dt className="text-nier-text-dark/60">Target</dt>
                <dd className="text-right text-nier-text-dark/80">{describeTarget(envelope.target)}</dd>
            </>
        )}
        {needed && (
            <>
                <dt className="text-nier-text-dark/60">Needed</dt>
                <SpanCell testId="needed" span={needed} />
            </>
        )}
    </dl>
);

const SpanCell = ({ testId, span }: { testId: string; span: Span }) => {
    const color = (n: number) => (n < 0 ? "text-red-800" : "text-nier-text-dark");
    return (
        <dd data-testid={testId} className="text-right tabular-nums">
            <span className={color(span.before)}>{formatCents(span.before)}</span>
            {span.after !== span.before && (
                <>
                    <span className="text-nier-text-dark/50"> → </span>
                    <span data-testid={`${testId}-after`} className={color(span.after)}>{formatCents(span.after)}</span>
                </>
            )}
        </dd>
    );
};

export default AssignModal;
