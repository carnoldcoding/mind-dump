import { useState } from "react";
import { TextField } from "../../../../components/common/TextField";
import { backend } from "../../../../api/backend";
import { centsToInput, parseDollars, todayIso } from "./money";
import { EditorModal, EnvelopeSelect, ErrorLine, MoneyField, primaryBtn, secondaryBtn } from "./ui";
import { errorText } from "./errorText";
import { KindToggle } from "./TransactionModal";
import type { Envelope, Schedule, TransactionKind } from "../../../../types/finances";

type Props = {
    open: boolean;
    schedule: Schedule | null;
    envelopes: Envelope[];
    payees: string[];
    onClose: () => void;
    onSaved: () => void;
};

/** "1, 15" → [1, 15]. Null unless every part is a day of the month. */
function parseDays(text: string): number[] | null {
    const parts = text.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 0) return null;
    const days = parts.map(Number);
    return days.every(d => Number.isInteger(d) && d >= 1 && d <= 31) ? days : null;
}

// Pay and bills that record themselves on fixed days of each month (D14).
// The first recording is today at the earliest — nothing is back-dated (R28) —
// and an edit changes future recordings only (R25).
const ScheduleModal = ({ open, schedule, envelopes, payees, onClose, onSaved }: Props) => {
    const [kind, setKind] = useState<TransactionKind>(schedule?.kind ?? "spending");
    const [amount, setAmount] = useState(schedule ? centsToInput(schedule.amount) : "");
    const [envelopeId, setEnvelopeId] = useState(schedule?.envelopeId ?? "");
    const [payee, setPayee] = useState(schedule?.payee ?? "");
    const [note, setNote] = useState(schedule?.note ?? "");
    const [days, setDays] = useState(schedule ? schedule.days.join(", ") : "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const cents = parseDollars(amount);
        const dayList = parseDays(days);
        if (cents == null) { setError("Enter an amount"); return; }
        if (!dayList) { setError("Enter days of the month, 1–31, like 1, 15"); return; }
        if (kind === "spending" && !envelopeId) { setError("Pick an Envelope"); return; }

        setSaving(true);
        setError("");
        const payload = {
            payee, note, kind, amount: cents, days: dayList,
            envelopeId: kind === "spending" ? envelopeId : null,
        };
        try {
            if (schedule) await backend.updateFinanceSchedule(schedule._id, payload);
            else await backend.addFinanceSchedule(payload, todayIso());
            onSaved();
            onClose();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!schedule) return;
        try {
            await backend.removeFinanceSchedule(schedule._id);
            onSaved();
            onClose();
        } catch (e) {
            setError(errorText(e));
        }
    };

    return (
        <EditorModal open={open} title={schedule ? "Edit Schedule" : "New Schedule"} onClose={onClose}>
            <KindToggle kind={kind} onChange={setKind} />
            <TextField label="Payee" value={payee} onChange={setPayee} autofillData={payees} suggestWhenEmpty />
            <MoneyField label="Amount $" value={amount} onChange={setAmount} />
            {kind === "spending"
                ? <EnvelopeSelect label="Envelope" envelopes={envelopes} value={envelopeId} onChange={setEnvelopeId} />
                : <p className="text-label text-nier-text-dark/60">Income goes to Unassigned.</p>}
            <TextField label="Days of the month" value={days} onChange={setDays} />
            <p className="text-label text-nier-text-dark/60">
                A day the month lacks, like the 31st in November, records on the month's last day.
            </p>
            <TextField label="Note" value={note} onChange={setNote} />

            <ErrorLine error={error} />

            <div className="flex justify-between gap-2 pt-1">
                {schedule ? <button onClick={handleDelete} className={secondaryBtn}>Delete</button> : <span />}
                <div className="flex gap-2">
                    <button onClick={onClose} className={secondaryBtn}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} className={primaryBtn}>{saving ? "…" : "Save"}</button>
                </div>
            </div>
        </EditorModal>
    );
};

export default ScheduleModal;
