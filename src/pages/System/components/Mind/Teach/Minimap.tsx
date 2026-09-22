import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMindGraph } from "../../../../../store/mind";
import { useSessionStore } from "../../../../../store/mindSession";
import { animationsDisabled } from "../../../../../utils/animations";
import { levelForLogos } from "../../../../../utils/mindLevel";
import type { MindQuest } from "../../../../../types/mind";

// The live minimap beside the chat (spec §17): the active discipline, its quests
// as nodes that ignite on mastery, a Boss meter, level, and Logos. Read-only —
// the full Map tab owns exploration.

const BOSS_EVERY = 3;

// Glyph + tone for a quest's state. Palette is near-monochrome, so state reads
// through fill/shape (chrome.md), not colour.
function glyph(q: MindQuest): { mark: string; dim: boolean } {
    if (q.prestiged) return { mark: "✦", dim: false };
    if (q.mastered) return { mark: "●", dim: false };
    if (q.streak > 0) return { mark: "◐", dim: false };
    return { mark: "○", dim: true };
}
const isDue = (q: MindQuest) =>
    q.mastered && !q.prestiged && !!q.nextRecallDue && new Date(q.nextRecallDue) <= new Date();

const Minimap = ({ disciplineId }: { disciplineId: string | null }) => {
    const { quests, disciplines } = useMindGraph();
    const milestone = useSessionStore(s => s.milestone);
    const scope = useRef<HTMLDivElement>(null);

    const disc = disciplines.find(d => d._id === disciplineId) ?? null;
    const nodes = disc ? quests.filter(q => `${q.domain}/${q.discipline}` === disc._id) : [];
    const level = disc ? levelForLogos(disc.logos) : 1;

    // Ignite the milestone's node: a short guarded pulse, so it respects the
    // motion seam (animations.ts) rather than animating under reduced-motion.
    useGSAP(() => {
        if (animationsDisabled() || !milestone) return;
        const el = scope.current?.querySelector<HTMLElement>(`[data-quest="${milestone.quest}"]`);
        if (el) gsap.fromTo(el, { scale: 1 }, { scale: 1.7, yoyo: true, repeat: 1, duration: 0.22, ease: "power2.out", transformOrigin: "center" });
    }, { scope, dependencies: [milestone?.at] });

    if (!disc) {
        return (
            <div ref={scope} className="flex flex-col gap-2 p-3 border border-nier-150 bg-nier-100-lighter">
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">No active discipline</span>
                <p className="text-label text-nier-text-dark/60">Start a topic and it lights up here.</p>
            </div>
        );
    }

    const sinceBoss = disc.questsSinceBoss ?? 0;

    return (
        <div ref={scope} className="flex flex-col gap-3 p-3 border border-nier-150 bg-nier-100-lighter">
            {/* header: discipline · level · boss meter */}
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark font-semibold">{disc.slug}</span>
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">L{level}</span>
            </div>

            {/* nodes */}
            <div className="flex flex-wrap gap-2">
                {nodes.map(q => {
                    const g = glyph(q);
                    return (
                        <span
                            key={q._id}
                            data-quest={q.slug}
                            title={`${q.title}${q.streak ? ` · streak ${q.streak}/3` : ""}${isDue(q) ? " · due" : ""}`}
                            className={`text-body leading-none inline-flex items-center ${g.dim ? "text-nier-text-dark/40" : "text-nier-text-dark"}`}
                        >
                            {g.mark}
                            {isDue(q) && <span className="text-eyebrow text-nier-text-dark/70 ml-0.5">▸</span>}
                        </span>
                    );
                })}
                {nodes.length === 0 && <span className="text-label text-nier-text-dark/50">no quests yet</span>}
            </div>

            {/* boss meter + logos */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-nier-dark/10">
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/60">
                    boss{" "}
                    {Array.from({ length: BOSS_EVERY }).map((_, i) => (
                        <span key={i} className={i < sinceBoss ? "text-nier-text-dark" : "text-nier-text-dark/30"}>◈</span>
                    ))}
                </span>
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/70">{disc.logos} Λ</span>
            </div>
        </div>
    );
};

export default Minimap;
