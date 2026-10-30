import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { backend } from "../../../../api/backend";
import WorkoutGrid from "./WorkoutGrid";
import MovementChart from "./MovementChart";
import MovementList from "./MovementList";
import LogBar from "./LogBar";
import NewMovementModal from "./NewMovementModal";
import MovementEditModal from "./MovementEditModal";
import EntryEditModal from "./EntryEditModal";
import { partitionBodyDocs, describeEntry, docId } from "./entry";
import type { BodyDoc, Entry } from "./entry";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../../utils/motion";
import { useRetained } from "../../../../hooks/useRetained";
import { Panel } from "../../../../components/common/Panel";
import { TabStrip } from "../../../../components/common/TabStrip";
import { ShadowBox } from "../../../../components/common/ShadowBox";

type ActiveTab = "chart" | "history";

const TABS: { id: ActiveTab; label: string }[] = [
    { id: "chart", label: "Chart" },
    { id: "history", label: "History" },
];

// Runs as a tab on the SYSTEM.OS desktop: the Desktop owns the frame chrome and
// the close control, so this window carries no title bar of its own and fills
// the content area it is given.
const BodyWindow = () => {
    // No signal to wait on: this window only ever mounts well after boot is
    // done — the user has to open System, then click a folder icon — and
    // Desktop's conditional render gives it a fresh mount each time. The
    // canonical order: the frame Wipes, its title Decodes, and the rest of the
    // chrome Fades a beat behind.
    // The frame Wipes as stable chrome. The chrome — Movement list, log bar,
    // Chart / History strip, grid — Cascades when it first has something to
    // show: on open, when the docs land, when a Movement is first selected.
    // After that only the box under the strip Cascades, on a tab change or a
    // new Movement (docs/motion.md, Mind's split). Logging animates nothing;
    // the numbers change in place.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
    }, scope);
    const panelRef = useRef<HTMLElement>(null);

    const [docs, setDocs]                         = useState<BodyDoc[]>([]);
    const [selectedName, setSelectedName]         = useState<string | null>(null);
    const [creating, setCreating]                 = useState(false);
    const [editingName, setEditingName]           = useState<string | null>(null);
    const [editingEntry, setEditingEntry]         = useState<Entry | null>(null);
    const [activeTab, setActiveTab]               = useState<ActiveTab>("chart");

    const tabContentRef = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        if (panelRef.current) cascade(tl, panelRef.current, 0.15);
    }, scope, [docs.length === 0, selectedName === null]);
    useRevealTimeline(true, (tl) => {
        if (tabContentRef.current) cascade(tl, tabContentRef.current, 0);
    }, scope, [selectedName, activeTab]);

    const fetchDocs = useCallback(async () => {
        try {
            setDocs(await backend.getBodyEntries());
        } catch { /* network error */ }
    }, []);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    // ── Derived data ────────────────────────────────────────────────
    const { movements, entries } = useMemo(() => partitionBodyDocs(docs), [docs]);

    useEffect(() => {
        if (movements.length === 0) return;
        if (selectedName === null || !movements.some(m => m.workoutName === selectedName)) {
            setSelectedName(movements[0].workoutName);
        }
    }, [movements, selectedName]);

    const selected = useMemo(
        () => movements.find(m => m.workoutName === selectedName) ?? null,
        [movements, selectedName]
    );

    const selectedEntries = useMemo(
        () => entries
            .filter(e => e.workoutName === selectedName)
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
        [entries, selectedName]
    );

    const lastEntry = selectedEntries[0] ?? null;

    const editingMovement = useMemo(
        () => movements.find(m => m.workoutName === editingName) ?? null,
        [movements, editingName]
    );

    // Held so the edit modals can play their exit over the record that was on
    // screen, rather than over an empty dialog — see useRetained. Three
    // separate values because they answer three different questions: what is
    // being edited, which entry, and which Movement that entry belongs to.
    const shownMovement = useRetained(editingMovement);
    const shownEntry = useRetained(editingEntry);
    const shownSelected = useRetained(selected);

    // ── Mutations ───────────────────────────────────────────────────
    const handleDeleteMovement = useCallback(async (workoutName: string) => {
        const doomed = docs.filter(d => d.workoutName === workoutName);
        await Promise.all(doomed.map(d => {
            const id = docId(d);
            return id ? backend.removeBodyEntry(id) : Promise.resolve();
        }));
        if (selectedName === workoutName) setSelectedName(null);
        setEditingName(null);
        fetchDocs();
    }, [docs, selectedName, fetchDocs]);

    const handleDeleteEntry = useCallback(async (id: string) => {
        await backend.removeBodyEntry(id);
        fetchDocs();
    }, [fetchDocs]);

    // Every Movement gets its order rewritten, so the sequence stays dense
    // and total rather than depending on whatever the previous values were.
    // The caller names the Movement to swap with, because the neighbour the
    // user can see isn't the adjacent one when a tag filter is applied.
    const handleReorder = useCallback(async (workoutName: string, swapWith: string) => {
        const idx = movements.findIndex(m => m.workoutName === workoutName);
        const swapIdx = movements.findIndex(m => m.workoutName === swapWith);
        if (idx === -1 || swapIdx === -1) return;

        const reordered = [...movements];
        [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

        await Promise.all(reordered.map((m, order) =>
            m.id ? backend.updateBodyEntry({ id: m.id, order }) : Promise.resolve()
        ));
        fetchDocs();
    }, [movements, fetchDocs]);

    return (
        <>
            <Panel
                wrapperRef={scope}
                wrapperClassName="h-full"
                className="bg-nier-100 border border-nier-150 h-full"
                frameRef={panelRef}
            >

                    <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

                        <div className="flex gap-4 flex-col md:flex-row md:items-start">
                            <MovementList
                                movements={movements}
                                selected={selectedName}
                                onSelect={setSelectedName}
                                onEdit={setEditingName}
                                onReorder={handleReorder}
                                onCreate={() => setCreating(true)}
                            />

                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                                {selected ? (
                                    <>
                                        <LogBar
                                            key={`${selected.workoutName}:${lastEntry?.id ?? "none"}`}
                                            movement={selected}
                                            lastEntry={lastEntry}
                                            onSaved={fetchDocs}
                                        />

                                        {/* The strip is the top edge of the box it switches; it
                                            stays put while the content under it fades in. */}
                                        <ShadowBox className="bg-nier-100-lighter border border-nier-150 flex flex-col">
                                            <TabStrip tabs={TABS} active={activeTab} onChange={setActiveTab} />
                                            <div ref={tabContentRef} data-reveal-own className="flex flex-col">
                                                {activeTab === "chart" ? (
                                                    <MovementChart entries={selectedEntries} goal={selected.goal} />
                                                ) : (
                                                    <section aria-label="History" className="h-64 overflow-y-auto">
                                                        {selectedEntries.length === 0 ? (
                                                            <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No entries yet.</p>
                                                        ) : selectedEntries.map(e => (
                                                            <button
                                                                key={e.id ?? e.datetime}
                                                                onClick={() => e.id && setEditingEntry(e)}
                                                                className="w-full flex items-center justify-between gap-3 px-3 py-3 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                                                            >
                                                                <span className="text-eyebrow text-nier-text-dark/50 uppercase tracking-wide shrink-0">
                                                                    {new Date(e.datetime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                                                </span>
                                                                <span className="text-label text-nier-text-dark">{describeEntry(e)}</span>
                                                            </button>
                                                        ))}
                                                    </section>
                                                )}
                                            </div>
                                        </ShadowBox>
                                    </>
                                ) : (
                                    <div className="h-64 bg-nier-100-lighter border border-nier-150 flex items-center justify-center">
                                        <span className="text-nier-text-dark/40 text-label uppercase tracking-widest">
                                            {movements.length === 0 ? "Add a movement to begin" : "Select a movement"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Review artifact, so it sits below the things you came to do. */}
                        <WorkoutGrid entries={entries} />
                    </div>
            </Panel>

            {/* Rendered unconditionally and told whether they are open. A
                modal the parent removes from the tree has nothing left to
                animate, which is why nothing here used to have an exit. The
                two that describe a selection hold on to it while they leave,
                so the exit plays over the record the reader was looking at
                rather than over an empty dialog. */}
            <NewMovementModal
                open={creating}
                order={movements.length}
                onClose={() => setCreating(false)}
                onSaved={(workoutName) => { setSelectedName(workoutName); fetchDocs(); }}
            />

            {shownMovement && (
                <MovementEditModal
                    open={!!editingMovement}
                    movement={shownMovement}
                    onClose={() => setEditingName(null)}
                    onSaved={fetchDocs}
                    onDelete={handleDeleteMovement}
                />
            )}

            {shownEntry && shownSelected && (
                <EntryEditModal
                    open={!!(editingEntry && selected)}
                    entry={shownEntry}
                    movementName={shownSelected.displayName}
                    onClose={() => setEditingEntry(null)}
                    onSaved={() => { fetchDocs(); setEditingEntry(null); }}
                    onDelete={id => { handleDeleteEntry(id); setEditingEntry(null); }}
                />
            )}
        </>
    );
};

export default BodyWindow;
