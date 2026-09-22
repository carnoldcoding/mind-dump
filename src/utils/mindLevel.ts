// Client-side mirror of the backend Logos→Level curve (lib/mind/leveling.js):
// costForLevel(n) = min(n, 3) * 100. The /graph endpoint returns raw Logos on
// each discipline; surfaces derive the level from it here rather than the
// backend sending a computed field.

const LEVEL_CAP = 3;
const QUEST_LOGOS = 100;

function costForLevel(level: number): number {
    return Math.min(level, LEVEL_CAP) * QUEST_LOGOS;
}

function thresholdForLevel(level: number): number {
    let total = 0;
    for (let l = 1; l < level; l++) total += costForLevel(l);
    return total;
}

export function levelForLogos(logos: number): number {
    let level = 1;
    while (logos >= thresholdForLevel(level + 1)) level++;
    return level;
}
