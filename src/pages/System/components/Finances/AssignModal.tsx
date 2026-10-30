import { useState } from "react";
import { DateField } from "../../../../components/common/DateField";
import { backend } from "../../../../api/backend";
import { centsToInput, formatCents, parseDollars, todayIso } from "./money";
import { EditorModal, EnvelopeSelect, ErrorLine, MoneyField, primaryBtn, secondaryBtn } from "./ui";
import { errorText } from "./errorText";
import type { Assignment, Envelope } from "../../../../types/finances";

type Props = {
    open: boolean;
    /** The Assignment being edited, or null to make a new one. */
    assignment: Assignment | null;
    envelopes: Envelope[];
    unassigned: number;
    onClose: () => void;
    onSaved: () => void;
};

// One form for both ways money moves: out of Unassigned into an Envelope
// (R15), or from one Envelope to another, which is how a negative balance is
// covered (R16). "From" decides which. The backend refuses a new Assignment
// larger than Unassigned; an edit is not capped (R12).
const AssignModal = ({ open, assignment, envelopes, unassigned, onClose, onSaved }: Props) => {
    const [amount, setAmount] = useState(assignment ? centsToInput(assignment.amount) : "");
    const [from, setFrom] = useState(assignment?.sourceEnvelopeId ?? "");
    const [to, setTo] = useState(assignment?.envelopeId ?? "");
    const [date, setDate] = useState(assignment?.date ?? todayIso());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const cents = parseDollars(amount);
        if (cents == null) { setError("Enter an amount"); return; }
        if (!to) { setError("Pick the Envelope it goes to"); return; }

        setSaving(true);
        setError("");
        const payload = { date, amount: cents, envelopeId: to, sourceEnvelopeId: from || null };
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

    return (
        <EditorModal open={open} title={assignment ? "Edit Assignment" : "Assign / Move"} onClose={onClose}>
            <EnvelopeSelect
                label="From"
                envelopes={envelopes.filter(e => e._id !== to)}
                value={from}
                onChange={setFrom}
                noneLabel={`Unassigned (${formatCents(unassigned)})`}
            />
            <EnvelopeSelect label="To Envelope" envelopes={envelopes.filter(e => e._id !== from)} value={to} onChange={setTo} />
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

export default AssignModal;
