import type {
  Ability,
  AbilityType,
  Behavior,
  CreationKind,
  Drop,
  ForgeMode,
  Rarity,
  Silhouette,
  Spec,
} from "./types";

export const STARTER_COINS = 3;

export function quoteCost(mode: ForgeMode, idea: string, _existingReady: number): number {
  if (mode === "create") return 1;
  return idea.trim().length > 280 ? 2 : 1;
}

export function newId(): string {
  return globalThis.crypto.randomUUID();
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return slug || "creation";
}

export function identifier(name: string): string {
  return `anvil:${slugify(name)}`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const value = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const KINDS = ["mob", "item", "block", "weapon"] as const;
const BEHAVIORS = ["hostile", "neutral", "passive"] as const;
const RARITIES = ["common", "uncommon", "rare", "legendary"] as const;
const ABILITY_TYPES = ["projectile", "summon", "aura", "melee", "passive"] as const;
const SILHOUETTES = ["humanoid", "dragon", "beast", "blade", "orb", "block"] as const;

const PALETTES: Record<string, [string, string, string]> = {
  lava: ["#c4512c", "#2a211c", "#ffb15a"],
  fire: ["#d4652f", "#3a2418", "#ffd19a"],
  ice: ["#d5e6f2", "#6f93b0", "#f4fbff"],
  lightning: ["#2c3348", "#f0d56a", "#9fd4ff"],
  obsidian: ["#2a2433", "#141018", "#ff7a3c"],
  moss: ["#4e6b45", "#243024", "#d6e2a8"],
  gold: ["#e0b15a", "#6b4e22", "#fff1c9"],
  shadow: ["#2a2e36", "#121418", "#9aa4b8"],
  crystal: ["#c9b6e8", "#6d5a8a", "#f7f1ff"],
  water: ["#3f7ea6", "#163246", "#d5f1ff"],
  nature: ["#6d8f4e", "#2c3824", "#e4d2a4"],
};

export function paletteFor(text: string): [string, string, string] {
  const hay = text.toLowerCase();
  for (const [key, colors] of Object.entries(PALETTES)) {
    if (hay.includes(key)) return colors;
  }
  return ["#c4a574", "#3a3228", "#f0d7a4"];
}

function silhouetteFor(type: CreationKind, text: string): Silhouette {
  const hay = text.toLowerCase();
  if (/\b(dragon|wyvern|drake)\b/.test(hay)) return "dragon";
  if (/\b(wolf|beast|cat|hound|spider|slime|golem)\b/.test(hay)) {
    return type === "mob" && /\b(golem)\b/.test(hay) ? "humanoid" : "beast";
  }
  if (type === "weapon") return "blade";
  if (type === "item") return "orb";
  if (type === "block") return "block";
  return "humanoid";
}

function ability(raw: Partial<Ability> | undefined, index: number): Ability | null {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name ?? "").trim().slice(0, 40);
  if (!name) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    name,
    type: pick<AbilityType>(raw.type, ABILITY_TYPES, "passive"),
    detail: String(raw.detail ?? "").trim().slice(0, 180),
    cooldown: clamp(raw.cooldown, 0, 120, 4),
    damage: clamp(raw.damage, 0, 80, 6),
    range: clamp(raw.range, 0, 64, 12),
  };
}

function drop(raw: Partial<Drop> | undefined): Drop | null {
  if (!raw || typeof raw !== "object") return null;
  const item = String(raw.item ?? "").trim().slice(0, 40);
  if (!item) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
    item,
    quantity: Math.round(clamp(raw.quantity, 1, 64, 1)),
    chance: clamp(raw.chance, 0, 1, 0.5),
  };
}

export function normalizeSpec(input: unknown, fallbackIdea = "Creation"): Spec {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<Spec> & {
    appearance?: Partial<Spec["appearance"]>;
    spawn?: Partial<Spec["spawn"]>;
  };
  const idea = `${fallbackIdea} ${raw.name ?? ""} ${raw.summary ?? ""}`;
  const type = pick<CreationKind>(raw.type, KINDS, guessKind(fallbackIdea));
  const [primary, secondary, glow] = paletteFor(idea);
  const name = String(raw.name ?? "").trim().slice(0, 32) || titleFromIdea(fallbackIdea);
  const appearance: Partial<Spec["appearance"]> = raw.appearance ?? {};
  const spawn: Partial<Spec["spawn"]> = raw.spawn ?? {};
  const abilities = Array.isArray(raw.abilities)
    ? raw.abilities.map((item, index) => ability(item, index)).filter((item): item is Ability => !!item).slice(0, 4)
    : [];
  const drops = Array.isArray(raw.drops)
    ? raw.drops.map((item) => drop(item)).filter((item): item is Drop => !!item).slice(0, 4)
    : [];

  return {
    type,
    name,
    summary: String(raw.summary ?? "").trim().slice(0, 280) || `A ${name.toLowerCase()} made from the idea you described.`,
    health: Math.round(clamp(raw.health, 1, type === "mob" ? 1000 : 500, type === "mob" ? 40 : 120)),
    damage: Math.round(clamp(raw.damage, 0, 40, type === "block" ? 0 : 6)),
    movementSpeed: Math.round(clamp(raw.movementSpeed, 0, 0.45, type === "mob" ? 0.25 : 0) * 100) / 100,
    scale: Math.round(clamp(raw.scale, 0.4, 4, 1) * 100) / 100,
    behavior: pick<Behavior>(raw.behavior, BEHAVIORS, type === "mob" ? "hostile" : "passive"),
    friendlyByDay: Boolean(raw.friendlyByDay),
    silhouette: pick<Silhouette>(raw.silhouette, SILHOUETTES, silhouetteFor(type, idea)),
    spawn: {
      where: String(spawn.where ?? "").trim().slice(0, 80) || "Overworld surface",
      rarity: pick<Rarity>(spawn.rarity, RARITIES, "uncommon"),
    },
    drops,
    abilities,
    appearance: {
      material: String(appearance.material ?? "").trim().slice(0, 40) || "stone",
      primary: isHex(String(appearance.primary ?? "")) ? String(appearance.primary) : primary,
      secondary: isHex(String(appearance.secondary ?? "")) ? String(appearance.secondary) : secondary,
      glow: isHex(String(appearance.glow ?? "")) ? String(appearance.glow) : glow,
      notes: String(appearance.notes ?? "").trim().slice(0, 180),
    },
    sound: String(raw.sound ?? "").trim().slice(0, 80) || "Heavy, close, a little hollow",
    animation: String(raw.animation ?? "").trim().slice(0, 80) || "Slow idle with a weighty step",
  };
}

export function guessKind(idea: string): CreationKind {
  const hay = idea.toLowerCase();
  if (/\b(sword|axe|bow|blade|trident|dagger|staff|weapon)\b/.test(hay)) return "weapon";
  if (/\b(block|lantern|ore|brick|planks|stone)\b/.test(hay)) return "block";
  if (/\b(item|gem|ingot|potion|relic|charm|orb)\b/.test(hay)) return "item";
  return "mob";
}

export function titleFromIdea(idea: string): string {
  const called = idea.match(/\b(?:called|named)\s+([a-z][a-z\s]{1,28})/i);
  if (called?.[1]) return toTitle(called[1]);
  const cleaned = idea
    .replace(/^(make|create|build|give)\s+(me\s+)?(a|an|the)\s+/i, "")
    .replace(/\b(with|that|who|which)\b[\s\S]*$/i, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 4).join(" ");
  return toTitle(words || "New creation").slice(0, 32);
}

function toTitle(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type Check = {
  id: "behaviour" | "resource" | "texture" | "manifest";
  label: string;
  ok: boolean;
  hint?: string;
  focus?: "identity" | "abilities" | "appearance" | "body";
};

export function validateSpec(spec: Spec): { ready: boolean; checks: Check[] } {
  const nameOk = spec.name.trim().length > 0 && spec.name.trim().length <= 32 && slugify(spec.name) !== "creation" || spec.name.trim().length > 0;
  const slugOk = slugify(spec.name).length > 0 && spec.name.trim().length > 0;
  const badAbility = spec.abilities.find(
    (item) => !item.name.trim() || item.cooldown < 0 || item.damage < 0 || item.range < 0,
  );
  const behaviorOk =
    spec.health >= 1 &&
    spec.damage >= 0 &&
    spec.movementSpeed >= 0 &&
    !badAbility &&
    (spec.type !== "mob" || spec.behavior === "hostile" || spec.behavior === "neutral" || spec.behavior === "passive");
  const textureOk =
    isHex(spec.appearance.primary) && isHex(spec.appearance.secondary) && isHex(spec.appearance.glow);
  const resourceOk = spec.appearance.material.trim().length > 0 && spec.summary.trim().length > 0;

  const checks: Check[] = [
    {
      id: "behaviour",
      label: "Behaviour valid",
      ok: behaviorOk,
      hint: badAbility
        ? `There's a problem with the ${badAbility.name || "unnamed"} ability.`
        : "Health, damage, or behaviour is out of range.",
      focus: badAbility ? "abilities" : "body",
    },
    {
      id: "resource",
      label: "Resource pack valid",
      ok: resourceOk,
      hint: "Add a material and a short description so the resource pack has something to show.",
      focus: "appearance",
    },
    {
      id: "texture",
      label: "Texture available",
      ok: textureOk,
      hint: "Pick colours for the body, the trim, and the glow.",
      focus: "appearance",
    },
    {
      id: "manifest",
      label: "Manifest valid",
      ok: slugOk && nameOk,
      hint: "Give it a name Minecraft can use.",
      focus: "identity",
    },
  ];

  return { ready: checks.every((check) => check.ok), checks };
}

export function statLabel(type: CreationKind, stat: "health" | "damage"): string {
  if (stat === "health") {
    if (type === "block") return "Hardness";
    if (type === "weapon" || type === "item") return "Durability";
    return "Health";
  }
  if (type === "block") return "Blast resistance";
  return "Damage";
}
