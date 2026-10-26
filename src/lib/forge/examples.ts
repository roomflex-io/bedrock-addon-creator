import { newId, normalizeSpec } from "./spec";
import type { Project, Spec } from "./types";

const lava = normalizeSpec(
  {
    type: "mob",
    name: "Lava Golem",
    summary: "A heavy basalt golem with a furnace mouth. It throws fireballs, then roars and knocks you back.",
    health: 300,
    damage: 16,
    movementSpeed: 0.14,
    scale: 2.6,
    behavior: "hostile",
    friendlyByDay: false,
    silhouette: "humanoid",
    spawn: { where: "Nether wastes and lava pools", rarity: "rare" },
    drops: [{ item: "Blaze rod", quantity: 2, chance: 0.7 }],
    abilities: [
      {
        name: "Fireball",
        type: "projectile",
        detail: "Hurls a bright fireball that lights the ground.",
        cooldown: 2.6,
        damage: 12,
        range: 18,
      },
    ],
    appearance: {
      material: "cracked lava stone",
      primary: "#241612",
      secondary: "#ff5a12",
      glow: "#ffe7a0",
      notes: "Near-black basalt plates, a white-hot furnace mouth, lava along the fists.",
    },
    sound: "Stone grinding, then a furnace roar",
    animation: "Heavy step, arms cocked to throw",
  },
  "lava golem",
);

const dragon = normalizeSpec(
  {
    type: "mob",
    name: "Storm Drake",
    summary: "A lean dragon that rides thunderclouds and snaps lightning at anything metal.",
    health: 180,
    damage: 10,
    movementSpeed: 0.32,
    scale: 1.8,
    behavior: "hostile",
    friendlyByDay: false,
    silhouette: "dragon",
    spawn: { where: "Mountains in thunderstorms", rarity: "legendary" },
    drops: [{ item: "Prismarine", quantity: 1, chance: 0.4 }],
    abilities: [
      {
        name: "Lightning strike",
        type: "projectile",
        detail: "A bolt that jumps to the nearest player.",
        cooldown: 6,
        damage: 14,
        range: 22,
      },
    ],
    appearance: {
      material: "storm glass",
      primary: "#2c3348",
      secondary: "#171b28",
      glow: "#9fd4ff",
      notes: "Scales like wet slate, eyes like sheet lightning.",
    },
    sound: "Wind, then a dry crack",
    animation: "Wings half open, hovering idle",
  },
  "lightning dragon",
);

const sword = normalizeSpec(
  {
    type: "weapon",
    name: "Rime Blade",
    summary: "A short sword of packed ice. The slash leaves a freezing bite.",
    health: 250,
    damage: 9,
    movementSpeed: 0,
    scale: 1.2,
    behavior: "passive",
    friendlyByDay: false,
    silhouette: "blade",
    spawn: { where: "Crafted, not found", rarity: "rare" },
    drops: [],
    abilities: [
      {
        name: "Freezing slash",
        type: "melee",
        detail: "The edge bites cold into whatever it hits.",
        cooldown: 3,
        damage: 9,
        range: 3,
      },
    ],
    appearance: {
      material: "packed ice",
      primary: "#d5e6f2",
      secondary: "#6f93b0",
      glow: "#f4fbff",
      notes: "Pale blade, darker fuller, a cold sheen.",
    },
    sound: "A thin chime on the swing",
    animation: "A short, sharp arc",
  },
  "ice sword",
);

const lantern = normalizeSpec(
  {
    type: "block",
    name: "Moss Lantern",
    summary: "A stone lantern grown over with moss. It glows the colour of late sun.",
    health: 40,
    damage: 8,
    movementSpeed: 0,
    scale: 1,
    behavior: "passive",
    friendlyByDay: false,
    silhouette: "block",
    spawn: { where: "Forest floors", rarity: "uncommon" },
    drops: [{ item: "Stick", quantity: 2, chance: 1 }],
    abilities: [],
    appearance: {
      material: "mossy stone",
      primary: "#4e6b45",
      secondary: "#243024",
      glow: "#e4d2a4",
      notes: "Soft glow through a moss crust.",
    },
    sound: "A muffled tick, like a warm coal",
    animation: "Still, with a slow pulse of light",
  },
  "moss lantern",
);

function projectFrom(spec: Spec, idea: string): Project {
  const createdAt = "2026-04-02T12:00:00.000Z";
  return {
    id: `example-${slug(spec.name)}`,
    idea,
    createdAt,
    updatedAt: createdAt,
    phase: "ready",
    generationHistory: [
      {
        id: newId(),
        label: `Original ${spec.name}`,
        note: spec.summary,
        createdAt,
        source: "create",
        cost: 0,
        spec,
      },
    ],
    currentId: "",
    packIds: {
      behavior: newId(),
      resource: newId(),
      behaviorModule: newId(),
      resourceModule: newId(),
    },
  };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function finish(project: Project): Project {
  const first = project.generationHistory[0];
  return first ? { ...project, currentId: first.id } : project;
}

export const EXAMPLES: Project[] = [
  finish(projectFrom(lava, "Giant lava golem with 300 health that throws fireballs")),
  finish(projectFrom(dragon, "A lightning dragon")),
  finish(projectFrom(sword, "An ice sword with a freezing slash")),
  finish(projectFrom(lantern, "A moss lantern that glows softly")),
];

export function portraitFor(name: string | undefined): string | undefined {
  return name === "Lava Golem" ? "/lava-golem.jpg" : undefined;
}
