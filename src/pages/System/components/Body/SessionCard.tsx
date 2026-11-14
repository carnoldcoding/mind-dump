import { useState } from "react";
import { backend } from "../../../../api/backend";
import { ErrorLine, Section, primaryBtn, smallBtn } from "../Finances/ui";
import { errorText } from "../Finances/errorText";
import { NumberField } from "./fields";
import { blankFields, nextUp, prefill, sessionRows, valuesFromFields } from "./session";
import type { Row, SetFields } from "./session";
import { RULE_LABEL, describeSet, shortDate } from "./text";
import type { BodySummary, Movement, Session, SetValues, Workout } from "../../../../types/body";

type Props = {
    workout: Workout;
    movements: Movement[];
    /** Today's Session of this Workout, or null before its first Set. */
    session: Session | null;
    previous: BodySummary["previous"];
    date: string;
    onChanged: () => Promise<void> | void;
};

// One Session on one screen (spec R19–R25). The Plan already knows the
// Movement, the order and the set count, so nothing is picked from a list and
// nothing opens in a modal: the next Set to log is open, with the last
// Session's numbers beside it.
const SessionCard = ({ workout, movements, session, previous, date, onChanged }: Props) => {
    // A Movement the user opened by hand. Cleared after each save, so the
    // screen goes back to following the Plan order.
    const [picked, setPicked] = useState<string | null>(null);
    const [error, setError] = useState("");

    const rows = sessionRows(workout, movements, session);
    const next = nextUp(rows);
    const openId = picked ?? next?.movementId ?? null;
    const doneCount = rows.filter(r => r.done).length;

    // The Session is created by its first Set or its first skip, so opening
    // Today on a training day writes nothing.
    const ensure = async () => session ?? await backend.startBodySession(date, workout.key);

    const act = async (run: (s: Session) => Promise<unknown>) => {
        setError("");
        try {
            await run(await ensure());
            setPicked(null);
            await onChanged();
        } catch (e) {
            setError(errorText(e));
        }
    };

    return (
        <Section title={workout.name}>
            <div className="px-3 py-2 border-b border-nier-150/40">
                <span data-testid="session-progress" className="text-label uppercase tracking-widest text-nier-text-dark/70">
                    {doneCount} of {rows.length} movements done
                </span>
            </div>
            {rows.length === 0 && (
                <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">This Workout has no Movement. Add one in Plan.</p>
            )}
            {rows.map((row, i) => (
                <MovementRow
                    key={row.movement._id}
                    row={row}
                    paired={pairEdge(rows, i)}
                    open={row.movement._id === openId}
                    previous={previous[row.movement._id]}
                    onToggle={() => setPicked(p => (p === row.movement._id || (p === null && openId === row.movement._id) ? null : row.movement._id))}
                    onSave={values => act(s => backend.addBodySet(s._id, row.movement._id, values))}
                    onSkip={skipped => act(s => backend.skipBodyMovement(s._id, row.movement._id, skipped))}
                />
            ))}
            {error && <div className="px-3 py-2"><ErrorLine error={error} /></div>}
        </Section>
    );
};

/** Where a row sits in its Pair, so the two can be drawn as one bracket. */
function pairEdge(rows: Row[], i: number): "first" | "second" | null {
    const pair = rows[i].slot.pair;
    if (pair == null) return null;
    if (rows[i + 1]?.slot.pair === pair) return "first";
    if (rows[i - 1]?.slot.pair === pair) return "second";
    return null;
}

const MovementRow = ({ row, paired, open, previous, onToggle, onSave, onSkip }: {
    row: Row;
    paired: "first" | "second" | null;
    open: boolean;
    previous: { date: string; sets: Session["sets"] } | undefined;
    onToggle: () => void;
    onSave: (values: SetValues) => Promise<void>;
    onSkip: (skipped: boolean) => Promise<void>;
}) => {
    const { movement, sets, skipped, done } = row;
    const state = skipped ? "skipped" : done ? "done" : `${sets.length} of ${movement.sets}`;

    return (
        <div
            data-testid={`movement-${movement.name}`}
            data-open={open}
            className={`border-b border-nier-150/30 last:border-0 ${paired ? "border-l-4 border-l-nier-150" : ""}`}
        >
            <button
                onClick={onToggle}
                aria-expanded={open}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 text-left cursor-pointer transition-colors hover:bg-nier-150/30 ${open ? "bg-nier-150/30" : ""}`}
            >
                <span className="flex flex-col min-w-0">
                    <span className={`text-body truncate ${done && !open ? "text-nier-text-dark/50" : "text-nier-text-dark"}`}>{movement.name}</span>
                    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">
                        {RULE_LABEL[movement.rule]}{paired ? " · pair" : ""}
                    </span>
                </span>
                <span data-testid="state" className="text-label uppercase tracking-widest text-nier-text-dark/70 shrink-0">{state}</span>
            </button>

            {open && (
                <div className="px-3 pb-3 flex flex-col gap-3">
                    {previous && (
                        <p data-testid="last" className="text-label text-nier-text-dark/60">
                            Last, {shortDate(previous.date)}: {previous.sets.map(s => describeSet(movement, s)).join("  /  ")}
                        </p>
                    )}
                    {sets.map((s, n) => (
                        <p key={s.id} className="text-label text-nier-text-dark">Set {n + 1}: {describeSet(movement, s)}</p>
                    ))}
                    {skipped ? (
                        <div><button onClick={() => onSkip(false)} className={smallBtn}>Undo skip</button></div>
                    ) : (
                        // Keyed on the Set, so each Set starts from the last
                        // Session's value rather than from what was just typed.
                        <SetForm
                            key={sets.length}
                            movement={movement}
                            setNumber={sets.length + 1}
                            start={prefill(movement, previous, sets.length + 1)}
                            canSkip={sets.length === 0}
                            onSave={onSave}
                            onSkip={() => onSkip(true)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

// The fields a Set has depend on its Movement (R21): seconds for a hold; full
// reps otherwise, with partial and assisted reps only past failure.
const SetForm = ({ movement, setNumber, start, canSkip, onSave, onSkip }: {
    movement: Movement;
    setNumber: number;
    start: string;
    canSkip: boolean;
    onSave: (values: SetValues) => Promise<void>;
    onSkip: () => void;
}) => {
    const hold = movement.kind === "hold";
    const [fields, setFields] = useState<SetFields>({ ...blankFields, [hold ? "seconds" : "full"]: start });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = (key: keyof SetFields) => (v: string) => setFields(f => ({ ...f, [key]: v }));

    const save = async () => {
        const { values, error: reason } = valuesFromFields(movement, fields);
        if (!values) { setError(reason ?? "Check the numbers"); return; }
        setError("");
        setSaving(true);
        try { await onSave(values); } finally { setSaving(false); }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3">
                {hold ? (
                    <div className="min-w-0 sm:w-32"><NumberField label="Seconds" value={fields.seconds} onChange={set("seconds")} /></div>
                ) : (
                    <>
                        <div className="min-w-0 sm:w-28"><NumberField label="Full" value={fields.full} onChange={set("full")} /></div>
                        {movement.rule === "pastFailure" && (
                            <>
                                <div className="min-w-0 sm:w-28"><NumberField label="Partial" value={fields.partial} onChange={set("partial")} /></div>
                                <div className="min-w-0 sm:w-28"><NumberField label="Assisted" value={fields.assisted} onChange={set("assisted")} /></div>
                            </>
                        )}
                    </>
                )}
                {movement.loaded && (
                    <div className="min-w-0 sm:w-28"><NumberField label="Load lb" value={fields.load} onChange={set("load")} decimal /></div>
                )}
                <button onClick={save} disabled={saving} className={primaryBtn}>
                    {saving ? "…" : `Save set ${setNumber}`}
                </button>
            </div>
            <ErrorLine error={error} />
            {canSkip && <div><button onClick={onSkip} className={smallBtn}>Skip</button></div>}
        </div>
    );
};

export default SessionCard;
