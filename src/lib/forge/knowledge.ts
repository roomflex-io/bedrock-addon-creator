export type LibraryEntry = {
  kind: "framework" | "module";
  name: string;
  description: string;
  tags: string[];
  verified: boolean;
  successRate: number;
};

export const LIBRARY: LibraryEntry[] = [
  { kind: "framework", name: "lava_golem_v1", description: "Verified lava golem with a furnace chest and fireball. Adapt this for lava or golem requests.", tags: ["lava", "golem", "fireball", "basalt", "nether"], verified: true, successRate: 0.99 },
  { kind: "framework", name: "basic_dragon", description: "Verified flying dragon. Keep flight and breath, then change colour, projectile, and drops.", tags: ["dragon", "wyvern", "fly", "breath", "wing"], verified: true, successRate: 0.97 },
  { kind: "framework", name: "basic_humanoid", description: "Verified walking humanoid. Use for villagers, zombies, skeletons, and golems.", tags: ["humanoid", "villager", "zombie", "skeleton", "golem", "boss"], verified: true, successRate: 0.98 },
  { kind: "framework", name: "basic_beast", description: "Verified four-legged mob.", tags: ["beast", "wolf", "bear", "cat", "chicken"], verified: true, successRate: 0.95 },
  { kind: "framework", name: "basic_weapon", description: "Verified held weapon.", tags: ["sword", "blade", "axe", "weapon"], verified: true, successRate: 0.99 },
  { kind: "module", name: "ranged_projectile", description: "One shooter. Change the projectile (fire, ice, lava) instead of a new attack system.", tags: ["fireball", "projectile", "breath", "snow", "ice", "lava", "spit", "shoot"], verified: true, successRate: 0.98 },
  { kind: "module", name: "melee_attack", description: "Close hit. Use this instead of a custom attack.", tags: ["melee", "bite", "punch", "slash", "hit"], verified: true, successRate: 0.97 },
  { kind: "module", name: "summon_minions", description: "Summons a vanilla mob.", tags: ["summon", "minion", "skeleton", "zombie"], verified: true, successRate: 0.88 },
  { kind: "module", name: "custom_loot", description: "Named drops.", tags: ["drop", "loot", "sword", "emerald"], verified: true, successRate: 0.96 },
  { kind: "module", name: "giant_scale", description: "Only changes scale.", tags: ["giant", "huge", "massive", "big"], verified: true, successRate: 0.99 },
];

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
}

export function searchLibrary(idea: string, limit = 6): LibraryEntry[] {
  const words = new Set(tokens(idea));
  const ranked = LIBRARY.map((entry) => {
    const overlap = entry.tags.filter((tag) => words.has(tag) || [...words].some((word) => word.includes(tag) || tag.includes(word))).length;
    const score = overlap * 3 + (entry.verified ? 2 : 0) + entry.successRate;
    return { entry, score, overlap };
  })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.score - a.score);
  const picked = ranked.slice(0, limit).map((item) => item.entry);
  if (picked.some((entry) => entry.kind === "framework")) return picked;
  const fallback = LIBRARY.find((entry) => entry.name === "basic_humanoid");
  return fallback ? [fallback, ...picked].slice(0, limit) : picked;
}

export function libraryBrief(entries: LibraryEntry[]): string {
  if (entries.length === 0) return "No close library match. Build the smallest new creation and do not invent module names.";
  return entries
    .map((entry) => `${entry.kind} ${entry.name} (${entry.verified ? "verified" : "experimental"}, ${Math.round(entry.successRate * 100)}%): ${entry.description}`)
    .join("\n");
}
