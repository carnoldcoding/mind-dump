import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backend } from "../../../../api/backend";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../../utils/motion";
import { Panel } from "../../../../components/common/Panel";
import { TabStrip } from "../../../../components/common/TabStrip";
import LogBar from "./LogBar";
import EnvelopesTab from "./EnvelopesTab";
import TransactionsTab from "./TransactionsTab";
import ReportTab from "./ReportTab";
import EnvelopeModal from "./EnvelopeModal";
import AssignModal from "./AssignModal";
import TransactionModal from "./TransactionModal";
import ScheduleModal from "./ScheduleModal";
import { useRetained } from "../../../../hooks/useRetained";
import { todayIso } from "./money";
import { monthOf, payeeSuggestions, type Month } from "./report";
import type { Assignment, Envelope, FinanceData, Schedule, Transaction } from "../../../../types/finances";

type ActiveTab = "envelopes" | "transactions" | "report";

const TABS: { id: ActiveTab; label: string }[] = [
    { id: "envelopes", label: "Envelopes" },
    { id: "transactions", label: "Transactions" },
    { id: "report", label: "Report" },
];

// Which editor is open, and over what. One at a time: opening a record from
// an Envelope's history closes the Envelope first, so modals never stack.
type Editing =
    | { kind: "envelope"; envelope: Envelope | null }
    | { kind: "assignment"; assignment: Assignment | null }
    | { kind: "transaction"; transaction: Transaction | null }
    | { kind: "schedule"; schedule: Schedule | null }
    | null;

type EditorKind = NonNullable<Editing>["kind"];

// Zero-based budgeting, as a System app (specs/mind-dump-finances.md). Runs as
// a tab on the SYSTEM.OS desktop like Body: the Desktop owns the frame chrome
// and the close control, so this window has no title bar of its own.
const FinancesWindow = () => {
    // Mind's split (docs/motion.md): the frame Wipes and the chrome — the tab
    // strip — Cascades once, on open. The log bar Cascades once, when the data
    // first lands. Only the tab content Cascades again, on a tab change, so
    // the strip and the log bar stay put while it fades in under them. A
    // reload after a save animates nothing; the numbers change in place.
    const scope = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => { wipe(tl, '[data-panel-surface]'); }, scope);
    useRevealTimeline(true, (tl) => { if (panelRef.current) cascade(tl, panelRef.current, 0.15); }, scope);

    const [data, setData] = useState<FinanceData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>("envelopes");
    const [month, setMonth] = useState<Month>(monthOf(todayIso()));
    const [editing, setEditing] = useState<Editing>(null);
    // Bumped on each open of that editor, so it remounts with fresh fields
    // rather than whatever the last record left in them. One counter per
    // editor: a shared one would remount an editor during its exit.
    const [editorKeys, setEditorKeys] = useState<Record<EditorKind, number>>(
        { envelope: 0, assignment: 0, transaction: 0, schedule: 0 }
    );

    // Each editor stays mounted after it closes and plays its exit over the
    // record it showed — see useRetained and docs/motion.md.
    const shownEnvelope = useRetained(editing?.kind === "envelope" ? editing : null);
    const shownAssignment = useRetained(editing?.kind === "assignment" ? editing : null);
    const shownTransaction = useRetained(editing?.kind === "transaction" ? editing : null);
    const shownSchedule = useRetained(editing?.kind === "schedule" ? editing : null);

    useRevealTimeline(true, (tl) => { if (logRef.current) cascade(tl, logRef.current, 0); }, scope, [data === null]);
    useRevealTimeline(true, (tl) => { if (contentRef.current) cascade(tl, contentRef.current, 0); }, scope, [data === null, activeTab]);

    // Each read also records any Scheduled transactions that have come due
    // (R26), so the window always opens on today's numbers.
    const refresh = useCallback(async () => {
        try {
            setData(await backend.getFinances(todayIso()));
            setLoadError(false);
        } catch {
            setLoadError(true);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const open = (next: NonNullable<Editing>) => {
        setEditorKeys(keys => ({ ...keys, [next.kind]: keys[next.kind] + 1 }));
        setEditing(next);
    };
    const close = () => setEditing(null);

    const payees = useMemo(() => (data ? payeeSuggestions(data.transactions) : []), [data]);
    const activeEnvelopes = useMemo(() => data?.envelopes.filter(e => !e.archived) ?? [], [data]);

    // A picker offers active Envelopes, plus the one a record already names
    // even if it has since been archived — editing an old Transaction must
    // not silently move it.
    const pickable = (keep: (string | null | undefined)[]) =>
        data ? data.envelopes.filter(e => !e.archived || keep.includes(e._id)) : [];

    return (
        <>
            <Panel
                wrapperRef={scope}
                wrapperClassName="h-full"
                className="bg-nier-100 border border-nier-150 h-full"
                frameRef={panelRef}
            >
                <div className="flex flex-col h-full min-h-0">
                    <TabStrip tabs={TABS} active={activeTab} onChange={setActiveTab} />

                    <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
                        {data === null ? (
                            <div className="h-64 bg-nier-100-lighter border border-nier-150 flex items-center justify-center">
                                <span className="text-nier-text-dark/40 text-label uppercase tracking-widest">
                                    {loadError ? "Couldn't reach the finances API." : "Loading…"}
                                </span>
                            </div>
                        ) : (
                            <>
                                <div ref={logRef} data-reveal-own>
                                    <LogBar envelopes={activeEnvelopes} payees={payees} onSaved={refresh} />
                                </div>

                                <div ref={contentRef} data-reveal-own className="flex flex-col gap-4">
                                    {activeTab === "envelopes" && (
                                        <EnvelopesTab
                                            data={data}
                                            onChanged={refresh}
                                            onOpenEnvelope={id => open({ kind: "envelope", envelope: id === "new" ? null : data.envelopes.find(e => e._id === id) ?? null })}
                                            onAssign={() => open({ kind: "assignment", assignment: null })}
                                        />
                                    )}
                                    {activeTab === "transactions" && (
                                        <TransactionsTab
                                            data={data}
                                            month={month}
                                            onMonth={setMonth}
                                            onEditTransaction={t => open({ kind: "transaction", transaction: t === "new" ? null : t })}
                                            onEditSchedule={s => open({ kind: "schedule", schedule: s === "new" ? null : s })}
                                        />
                                    )}
                                    {activeTab === "report" && <ReportTab data={data} month={month} onMonth={setMonth} />}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Panel>

            {data && shownEnvelope && (
                <EnvelopeModal
                    key={editorKeys.envelope}
                    open={editing?.kind === "envelope"}
                    envelope={shownEnvelope.envelope}
                    data={data}
                    onClose={close}
                    onSaved={refresh}
                    onEditAssignment={a => open({ kind: "assignment", assignment: a })}
                    onEditTransaction={t => open({ kind: "transaction", transaction: t })}
                />
            )}
            {data && shownAssignment && (
                <AssignModal
                    key={editorKeys.assignment}
                    open={editing?.kind === "assignment"}
                    assignment={shownAssignment.assignment}
                    envelopes={pickable([shownAssignment.assignment?.envelopeId, shownAssignment.assignment?.sourceEnvelopeId])}
                    unassigned={data.summary.unassigned}
                    onClose={close}
                    onSaved={refresh}
                />
            )}
            {data && shownTransaction && (
                <TransactionModal
                    key={editorKeys.transaction}
                    open={editing?.kind === "transaction"}
                    transaction={shownTransaction.transaction}
                    envelopes={pickable([shownTransaction.transaction?.envelopeId])}
                    payees={payees}
                    onClose={close}
                    onSaved={refresh}
                />
            )}
            {data && shownSchedule && (
                <ScheduleModal
                    key={editorKeys.schedule}
                    open={editing?.kind === "schedule"}
                    schedule={shownSchedule.schedule}
                    envelopes={pickable([shownSchedule.schedule?.envelopeId])}
                    payees={payees}
                    onClose={close}
                    onSaved={refresh}
                />
            )}
        </>
    );
};

export default FinancesWindow;
