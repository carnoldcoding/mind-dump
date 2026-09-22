import { useEffect, useMemo, useRef, useState } from "react";
import {
    forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide, forceX, forceY,
    type Simulation,
} from "d3-force";
import type { MindQuest } from "../../../../../types/mind";
import { animationsDisabled } from "../../../../../utils/animations";
import NodeDetail from "./NodeDetail";

// The Map's Graph lens (spec §8): an Obsidian-style force-directed canvas of the
// quest wikilink graph. d3-force computes positions; we render SVG in the app's
// chrome tokens and hand-roll pan / zoom / node-drag. Read-only.

type SimNode = MindQuest & { x?: number; y?: number; fx?: number | null; fy?: number | null };
type SimLink = { source: SimNode; target: SimNode };
type QState = "prestiged" | "mastered" | "progress" | "seed";

// A quest's state, as one label used for both the node fill and the detail card.
function stateOf(q: MindQuest): QState {
    if (q.prestiged) return "prestiged";
    if (q.mastered) return "mastered";
    if (q.started) return "progress";
    return "seed";
}
const isDue = (q: MindQuest) =>
    q.mastered && !q.prestiged && !!q.nextRecallDue && new Date(q.nextRecallDue) <= new Date();

const NODE_R = 9;

// The circle(s) that draw one node, centered on (0,0). Used both on the canvas
// and in the legend, so the key is literally a picture of each node type and the
// two can never drift apart.
const NodeMarks = ({ state, due, r = NODE_R }: { state: QState; due?: boolean; r?: number }) => {
    const fill = state === "mastered" || state === "prestiged" ? "var(--color-nier-dark)" : "var(--color-nier-100)";
    return (
        <>
            {due && <circle r={r + 3} fill="none" stroke="var(--color-nier-dark)" strokeWidth={0.8} strokeDasharray="2 2" />}
            {state === "prestiged" && <circle r={r + 2.5} fill="none" stroke="var(--color-nier-dark)" strokeWidth={1} />}
            <circle r={r} fill={fill} stroke="var(--color-nier-dark)" strokeWidth={state === "seed" ? 0.8 : 1.4} strokeOpacity={state === "seed" ? 0.4 : 1} />
            {state === "progress" && <circle r={r * 0.29} fill="var(--color-nier-dark)" />}
        </>
    );
};

// The legend rows — each renders a real swatch via NodeMarks. "Due" is a
// mastered node with the dashed ring, since only mastered quests come due.
const LEGEND: { state: QState; due?: boolean; label: string }[] = [
    { state: "seed", label: "seed" },
    { state: "progress", label: "in progress" },
    { state: "mastered", label: "mastered" },
    { state: "prestiged", label: "prestiged" },
    { state: "mastered", due: true, label: "recall due" },
];

const MapGraph = ({ quests }: { quests: MindQuest[] }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [, setTick] = useState(0);              // re-render on each simulation tick
    const [view, setView] = useState({ x: 0, y: 0, k: 1 });
    const [hover, setHover] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    // Live pointer interaction state, kept in a ref so handlers don't re-bind.
    const drag = useRef<{ mode: "pan" | "node" | null; node?: SimNode; startX: number; startY: number; vx: number; vy: number }>({ mode: null, startX: 0, startY: 0, vx: 0, vy: 0 });

    // Nodes + links, rebuilt when the quest set changes. Links are stored as bare
    // target slugs; resolve each to a node (first slug match) and skip the rest.
    // Reciprocal links collapse to one undirected edge.
    const { nodes, links } = useMemo(() => {
        const nodes: SimNode[] = quests.map(q => ({ ...q }));
        const bySlug = new Map(nodes.map(n => [n.slug, n]));
        const seen = new Set<string>();
        const links: SimLink[] = [];
        for (const n of nodes) {
            for (const slug of n.links || []) {
                const t = bySlug.get(slug);
                if (!t || t === n) continue;
                const key = [n.slug, t.slug].sort().join("|");
                if (seen.has(key)) continue;
                seen.add(key);
                links.push({ source: n, target: t });
            }
        }
        return { nodes, links };
    }, [quests]);

    // Adjacency, for hover highlighting.
    const neighbors = useMemo(() => {
        const m = new Map<string, Set<string>>();
        for (const l of links) {
            (m.get(l.source.slug) ?? m.set(l.source.slug, new Set()).get(l.source.slug)!).add(l.target.slug);
            (m.get(l.target.slug) ?? m.set(l.target.slug, new Set()).get(l.target.slug)!).add(l.source.slug);
        }
        return m;
    }, [links]);

    // Track the container size (forceCenter and the viewport depend on it).
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
        ro.observe(el);
        setSize({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);

    // The simulation. Disciplines get anchor points on a ring so same-discipline
    // quests cluster loosely (structure without adding colour — chrome.md).
    useEffect(() => {
        if (!size.w || !size.h || nodes.length === 0) return;
        const cx = size.w / 2, cy = size.h / 2;
        const discs = [...new Set(nodes.map(n => `${n.domain}/${n.discipline}`))];
        const anchor = new Map(discs.map((d, i) => {
            const a = (i / Math.max(1, discs.length)) * Math.PI * 2;
            const r = Math.min(size.w, size.h) * 0.32;
            return [d, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }];
        }));
        const ax = (n: SimNode) => anchor.get(`${n.domain}/${n.discipline}`)!.x;
        const ay = (n: SimNode) => anchor.get(`${n.domain}/${n.discipline}`)!.y;

        const sim = forceSimulation(nodes)
            .force("charge", forceManyBody().strength(-190))
            .force("link", forceLink<SimNode, SimLink>(links).distance(64).strength(0.35))
            .force("center", forceCenter(cx, cy))
            .force("collide", forceCollide(NODE_R * 2.4))
            .force("x", forceX(ax).strength(0.06))
            .force("y", forceY(ay).strength(0.06));
        simRef.current = sim;

        if (animationsDisabled()) {
            // Settle synchronously and render once — no animated jitter.
            sim.stop();
            for (let i = 0; i < 300; i++) sim.tick();
            setTick(t => t + 1);
        } else {
            sim.on("tick", () => setTick(t => t + 1));
        }
        return () => { sim.stop(); simRef.current = null; };
    }, [nodes, links, size.w, size.h]);

    // Screen → world coordinates, undoing the pan/zoom transform.
    const toWorld = (clientX: number, clientY: number) => {
        const r = wrapRef.current!.getBoundingClientRect();
        return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
    };

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const r = wrapRef.current!.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        const k = Math.min(3, Math.max(0.25, view.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        // Keep the point under the cursor fixed.
        setView(v => ({ k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k }));
    };

    const onPointerDownBg = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, vx: view.x, vy: view.y };
    };
    const onPointerDownNode = (e: React.PointerEvent, n: SimNode) => {
        e.stopPropagation();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        const w = toWorld(e.clientX, e.clientY);
        n.fx = w.x; n.fy = w.y;
        simRef.current?.alphaTarget(0.3).restart();
        drag.current = { mode: "node", node: n, startX: e.clientX, startY: e.clientY, vx: 0, vy: 0 };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (d.mode === "pan") {
            setView(v => ({ ...v, x: d.vx + (e.clientX - d.startX), y: d.vy + (e.clientY - d.startY) }));
        } else if (d.mode === "node" && d.node) {
            const w = toWorld(e.clientX, e.clientY);
            d.node.fx = w.x; d.node.fy = w.y;
        }
    };
    const onPointerUp = () => {
        const d = drag.current;
        if (d.mode === "node" && d.node) { d.node.fx = null; d.node.fy = null; simRef.current?.alphaTarget(0); }
        drag.current = { mode: null, startX: 0, startY: 0, vx: 0, vy: 0 };
    };

    const sel = selected ? nodes.find(n => n.slug === selected) ?? null : null;
    const activeSet = hover ? new Set([hover, ...(neighbors.get(hover) ?? [])]) : null;

    return (
        <div className="flex h-full min-h-0 gap-2">
            <div className="relative flex-1 min-h-0 border border-nier-150 bg-nier-100-lighter overflow-hidden">
            <div
                ref={wrapRef}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                onWheel={onWheel}
                onPointerDown={onPointerDownBg}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                <svg width={size.w} height={size.h} className="block select-none">
                    <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
                        {/* edges */}
                        {links.map((l, i) => {
                            const active = !activeSet || (activeSet.has(l.source.slug) && activeSet.has(l.target.slug));
                            return (
                                <line
                                    key={i}
                                    x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
                                    stroke="var(--color-nier-dark)"
                                    strokeWidth={0.8}
                                    strokeOpacity={active ? 0.35 : 0.06}
                                />
                            );
                        })}
                        {/* nodes */}
                        {nodes.map(n => {
                            const st = stateOf(n);
                            const dim = activeSet ? !activeSet.has(n.slug) : false;
                            const isSel = selected === n.slug;
                            return (
                                <g
                                    key={n.slug}
                                    transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
                                    opacity={dim ? 0.25 : 1}
                                    className="cursor-pointer"
                                    onPointerDown={e => onPointerDownNode(e, n)}
                                    onPointerEnter={() => setHover(n.slug)}
                                    onPointerLeave={() => setHover(h => (h === n.slug ? null : h))}
                                    onClick={e => { e.stopPropagation(); setSelected(s => (s === n.slug ? null : n.slug)); }}
                                >
                                    <NodeMarks state={st} due={isDue(n)} />
                                    <text
                                        y={NODE_R + 9}
                                        textAnchor="middle"
                                        fontSize={7}
                                        fill="var(--color-nier-text-dark)"
                                        fontWeight={isSel ? 700 : 400}
                                    >
                                        {n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            {/* legend — real swatches, drawn by the same NodeMarks as the canvas */}
            <div className="absolute left-2 bottom-2 flex flex-wrap items-center gap-x-3 gap-y-1 pointer-events-none bg-nier-100-lighter/80 px-1.5 py-1">
                {LEGEND.map((it, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                        <svg width={22} height={22} className="block flex-shrink-0">
                            <g transform="translate(11,11)"><NodeMarks state={it.state} due={it.due} r={6} /></g>
                        </svg>
                        <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">{it.label}</span>
                    </span>
                ))}
            </div>

            </div>

            {sel && (
                <NodeDetail
                    quest={sel}
                    quests={quests}
                    onSelect={(slug) => setSelected(slug)}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
};

export default MapGraph;
