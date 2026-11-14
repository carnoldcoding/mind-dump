import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { backend } from "../../../../api/backend";
import { ErrorLine, Section } from "../Finances/ui";
import { errorText } from "../Finances/errorText";
import { NumberField } from "./fields";
import { GLYPH, RULE_GLYPH, setPips } from "./glyphs";
import { GlyphButton } from "./marks";
import { pairEdge } from "./plan";
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
    /** The row that switches to another Workout of the week, when there is one. */
    chips?: ReactNode;
    onChanged: () => Promise<void> | void;
};

// One Session on one screen (body-plan R19–R25, body-ui R12–R16). The Plan
// already knows the Movement, the order and the set count, so nothing is
// picked from a list and nothing opens in a modal: the next Set to log is
// open, with the last Session's numbers above its fields.
const SessionCard = ({ workout, movements, session, previous, date, chips, onChanged }: Props) => {
    // A Movement the user opened by hand. Cleared after each save, so the
    // screen goes back to following the Plan order.
    const [picked, setPicked] = useState<string | null>(null);
    const [error, setError] = useState("");

    const rows = sessionRows(workout, movements, session);
    const next = nextUp(rows);
    const openId = picked ?? next?.movementId ?? null;
    const slots = rows.map(r => r.slot);

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
        <Section title="Session">
            {chips}
            {rows.length === 0 && (
                <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No Movement. Add one in Plan.</p>
            )}
            {rows.map((row, i) => (
                <MovementRow
                    key={row.movement._id}
                    row={row}
                    paired={pairEdge(slots, i) !== null}
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

function rowGlyph({ skipped, done, sets }: Row, open: boolean): string {
    if (open) return GLYPH.next;
    if (skipped) return GLYPH.skipped;
    if (done) return GLYPH.done;
    return sets.length > 0 ? GLYPH.started : GLYPH.open;
}

const MovementRow = ({ row, paired, open, previous, onToggle, onSave, onSkip }: {
    row: Row;
    paired: boolean;
    open: boolean;
    previous: { date: string; sets: Session["sets"] } | undefined;
    onToggle: () => void;
    onSave: (values: SetValues) => Promise<void>;
    onSkip: (skipped: boolean) => Promise<void>;
}) => {
    const { movement, sets, skipped, done } = row;
    const eyebrow = "w-20 shrink-0 text-eyebrow uppercase tracking-widest text-nier-text-dark/50";

    return (
        <div
            data-testid={`movement-${movement.name}`}
            data-open={open}
            className={`border-b border-nier-150/30 last:border-0 ${paired ? "border-l-4 border-l-nier-150" : ""}`}
        >
            <button
                onClick={onToggle}
                aria-expanded={open}
                className={`w-full flex items-center gap-3 px-3 min-h-12 text-left cursor-pointer transition-colors hover:bg-nier-150/30 ${open ? "bg-nier-150/30" : ""}`}
            >
                <span aria-hidden data-testid="mark" className="w-6 shrink-0 text-center text-body leading-none">{rowGlyph(row, open)}</span>
                <span className={`flex-1 min-w-0 text-body truncate ${done && !open ? "text-nier-text-dark/50" : "text-nier-text-dark"}`}>{movement.name}</span>
                <span title={RULE_LABEL[movement.rule]} aria-label={RULE_LABEL[movement.rule]} className="text-eyebrow text-nier-text-dark/50 shrink-0">
                    {RULE_GLYPH[movement.rule]}
                </span>
                <span
                    data-testid="state"
                    aria-label={skipped ? "Skipped" : `${sets.length} of ${movement.sets} sets`}
                    className="w-14 shrink-0 text-right text-label tracking-widest text-nier-text-dark/70"
                >
                    {skipped ? GLYPH.skipped : setPips(sets.length, movement.sets)}
                </span>
            </button>

            {open && (
                <div className="pl-12 pr-3 pb-3 flex flex-col gap-2">
                    {previous && (
                        <p data-testid="last" className="flex items-baseline text-label text-nier-text-dark/60 tabular-nums">
                            <span className={eyebrow}>Last {shortDate(previous.date)}</span>
                            <span>{previous.sets.map(s => describeSet(movement, s)).join(" / ")}</span>
                        </p>
                    )}
                    {sets.map((s, n) => (
                        <p key={s.id} className="flex items-baseline text-label text-nier-text-dark tabular-nums">
                            <span className={eyebrow}>Set {n + 1}</span>
                            <span>{describeSet(movement, s)}</span>
                        </p>
                    ))}
                    {skipped ? (
                        <div><GlyphButton glyph={GLYPH.skipped} label="Undo skip" pressed onClick={() => onSkip(false)} /></div>
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

// The fields a Set has depend on its Movement (body-plan R21): seconds for a
// hold; full reps otherwise, with partial and assisted reps only past failure.
// It is a form, so the Enter key saves as the ➤ control does (body-ui R15).
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

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const { values, error: reason } = valuesFromFields(movement, fields);
        if (!values) { setError(reason ?? "Check the numbers"); return; }
        setError("");
        setSaving(true);
        try { await onSave(values); } finally { setSaving(false); }
    };

    const field = "flex-1 basis-20 min-w-16 max-w-32";

    return (
        <form onSubmit={save} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 pt-2">
                {hold ? (
                    <div className={field}><NumberField label="Seconds" value={fields.seconds} onChange={set("seconds")} /></div>
                ) : (
                    <>
                        <div className={field}><NumberField label="Full" value={fields.full} onChange={set("full")} /></div>
                        {movement.rule === "pastFailure" && (
                            <>
                                <div className={field}><NumberField label="Partial" value={fields.partial} onChange={set("partial")} /></div>
                                <div className={field}><NumberField label="Assisted" value={fields.assisted} onChange={set("assisted")} /></div>
                            </>
                        )}
                    </>
                )}
                {movement.loaded && (
                    <div className={field}><NumberField label="Load lb" value={fields.load} onChange={set("load")} decimal /></div>
                )}
                <GlyphButton glyph={saving ? "…" : GLYPH.next} label={`Save set ${setNumber}`} type="submit" solid disabled={saving} />
                {canSkip && <GlyphButton glyph={GLYPH.skipped} label="Skip" onClick={onSkip} className="ml-auto" />}
            </div>
            <ErrorLine error={error} />
        </form>
    );
};

export default SessionCard;
