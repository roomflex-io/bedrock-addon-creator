import JSZip from "jszip";

const MAX_BYTES = 4_000_000;
const MAX_FILES = 500;
const MAX_FILE = 1_500_000;
const MAX_TOTAL = 16_000_000;

const BLOCKED = /\b(fuck|shit|bitch|cunt|nigger|faggot|porn|xxx|nude|naked|sex|boobs|penis|vagina)\b/i;

export type ImportedCreation = {
  id: string;
  name: string;
  kind: "entity" | "item" | "block";
  health?: number;
  damage?: number;
  scale?: number;
  files: string[];
};

export type ImportedAddon = {
  name: string;
  filename: string;
  behaviorPacks: number;
  resourcePacks: number;
  creations: ImportedCreation[];
  textures: number;
  recipes: number;
  preserved: number;
  preexisting: string[];
};

export type EditOutcome =
  | {
      ok: true;
      bytes: Uint8Array;
      filename: string;
      note: string;
      changed: string[];
      unchanged: number;
      preexisting: string[];
      validation: string[];
    }
  | { ok: false; error: string; choices?: { id: string; name: string }[] };

type Patch = {
  health?: number;
  damage?: number;
  scale?: number;
  movement?: number;
  multiplyHealth?: number;
  multiplyDamage?: number;
  multiplyScale?: number;
  multiplyMovement?: number;
  fireImmune?: boolean;
};

function safePath(name: string): string | null {
  const path = name.replace(/\\/g, "/");
  if (!path || path.startsWith("/") || path.includes("\0")) return null;
  const parts = path.split("/").filter((part) => part && part !== ".");
  if (parts.some((part) => part === "..")) return null;
  return parts.join("/");
}

function kindOf(path: string): string {
  const value = path.toLowerCase();
  if (value.endsWith("manifest.json")) return "manifest";
  if (value.includes("/entities/") && value.endsWith(".json")) return "entity";
  if (value.includes("/entity/") && value.endsWith(".json")) return "client";
  if (value.includes("/items/") && value.endsWith(".json")) return "item";
  if (value.includes("/blocks/") && value.endsWith(".json")) return "block";
  if (value.includes("/recipes/") && value.endsWith(".json")) return "recipe";
  if (value.endsWith(".png")) return "texture";
  if (value.endsWith(".json")) return "json";
  if (value.endsWith(".js") || value.endsWith(".mcfunction")) return "preserved";
  return "other";
}

function titleFromId(id: string): string {
  const last = id.split(":").pop() ?? id;
  return last
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readNumber(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "number" ? raw : undefined;
}

async function entries(bytes: Uint8Array): Promise<{ path: string; file: JSZip.JSZipObject }[]> {
  if (bytes.byteLength > MAX_BYTES) throw new Error("That add-on is over 4 MB.");
  const zip = await JSZip.loadAsync(bytes);
  const list: { path: string; file: JSZip.JSZipObject }[] = [];
  let total = 0;
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    const path = safePath(file.name);
    if (!path) throw new Error("That archive has an unsafe file path.");
    const size = (file as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof size === "number" && size > MAX_FILE) throw new Error("One file in that add-on is too large.");
    list.push({ path, file });
    if (list.length > MAX_FILES) throw new Error("That add-on has too many files.");
    total += typeof size === "number" ? size : 0;
    if (total > MAX_TOTAL) throw new Error("That add-on unpacks too large.");
  }
  return list;
}

function creationFrom(path: string, text: string, kind: ImportedCreation["kind"]): ImportedCreation | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const root = parsed as {
    "minecraft:entity"?: { description?: { identifier?: string }; components?: Record<string, unknown> };
    "minecraft:client_entity"?: { description?: { identifier?: string } };
    "minecraft:item"?: { description?: { identifier?: string }; components?: Record<string, unknown> };
    "minecraft:block"?: { description?: { identifier?: string } };
  };
  const body = root["minecraft:entity"] ?? root["minecraft:item"] ?? root["minecraft:block"] ?? root["minecraft:client_entity"];
  const id = body?.description?.identifier;
  if (!id || typeof id !== "string") return null;
  const components = ("components" in body && body.components ? body.components : {}) as Record<string, unknown>;
  const damageRaw = components["minecraft:damage"];
  return {
    id,
    name: titleFromId(id),
    kind,
    health: readNumber(components["minecraft:health"], "value") ?? readNumber(components["minecraft:health"], "max"),
    damage:
      readNumber(components["minecraft:attack"], "damage") ??
      (typeof damageRaw === "number" ? damageRaw : readNumber(damageRaw, "value")),
    scale: readNumber(components["minecraft:scale"], "value"),
    files: [path],
  };
}

export async function inspectArchive(bytes: Uint8Array, filename: string): Promise<ImportedAddon> {
  const list = await entries(bytes);
  const creations: ImportedCreation[] = [];
  const preexisting: string[] = [];
  let behaviorPacks = 0;
  let resourcePacks = 0;
  let textures = 0;
  let recipes = 0;
  let name = filename.replace(/\.(mcaddon|mcpack|zip)$/i, "") || "Add-on";

  for (const entry of list) {
    const kind = kindOf(entry.path);
    if (kind === "texture") textures += 1;
    if (kind === "recipe") recipes += 1;
    if (!entry.path.endsWith(".json")) continue;
    const text = await entry.file.async("string");
    if (kind === "manifest") {
      try {
        const manifest = JSON.parse(text) as {
          header?: { name?: string };
          modules?: { type?: string }[];
        };
        if (manifest.header?.name) name = manifest.header.name;
        for (const module of manifest.modules ?? []) {
          if (module.type === "data") behaviorPacks += 1;
          if (module.type === "resources") resourcePacks += 1;
        }
      } catch {
        preexisting.push(entry.path);
      }
      continue;
    }
    const parsedKind = kind === "entity" ? "entity" : kind === "item" ? "item" : kind === "block" ? "block" : null;
    if (!parsedKind) {
      try {
        JSON.parse(text);
      } catch {
        preexisting.push(entry.path);
      }
      if (kind === "client") {
        const client = creationFrom(entry.path, text, "entity");
        if (client) {
          const found = creations.find((item) => item.id === client.id);
          if (found) {
            found.files.push(entry.path);
            found.scale ??= client.scale;
          } else creations.push(client);
        }
      }
      continue;
    }
    const creation = creationFrom(entry.path, text, parsedKind);
    if (!creation) {
      preexisting.push(entry.path);
      continue;
    }
    const existing = creations.find((item) => item.id === creation.id);
    if (existing) {
      existing.files.push(entry.path);
      existing.health ??= creation.health;
      existing.damage ??= creation.damage;
      existing.scale ??= creation.scale;
    } else creations.push(creation);
  }

  return {
    name,
    filename,
    behaviorPacks,
    resourcePacks,
    creations,
    textures,
    recipes,
    preserved: list.length,
    preexisting: preexisting.slice(0, 6),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function patchTree(node: unknown, patch: Patch): number {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((sum, item) => sum + patchTree(item, patch), 0);
  const record = node as Record<string, unknown>;
  let hits = 0;
  for (const [key, value] of Object.entries(record)) {
    if (key === "minecraft:health" && value && typeof value === "object") {
      const health = value as { value?: number; max?: number };
      const current = health.value ?? health.max;
      const next =
        patch.health ?? (typeof current === "number" && patch.multiplyHealth ? current * patch.multiplyHealth : undefined);
      if (next != null) {
        const amount = clamp(next, 1, 1000);
        if (typeof health.value === "number" || health.value == null) health.value = amount;
        if (typeof health.max === "number") health.max = amount;
        hits += 1;
      }
    } else if (key === "minecraft:attack" && value && typeof value === "object") {
      const attack = value as { damage?: number };
      const next =
        patch.damage ?? (typeof attack.damage === "number" && patch.multiplyDamage ? attack.damage * patch.multiplyDamage : undefined);
      if (next != null && typeof attack.damage === "number") {
        attack.damage = clamp(next, 0, 1000);
        hits += 1;
      }
    } else if (key === "minecraft:damage") {
      const next =
        patch.damage ?? (typeof value === "number" && patch.multiplyDamage ? value * patch.multiplyDamage : undefined);
      if (typeof value === "number" && next != null) {
        record[key] = clamp(next, 0, 1000);
        hits += 1;
      }
    } else if (key === "minecraft:scale" && value && typeof value === "object") {
      const scale = value as { value?: number };
      const next =
        patch.scale ?? (typeof scale.value === "number" && patch.multiplyScale ? scale.value * patch.multiplyScale : undefined);
      if (next != null && typeof scale.value === "number") {
        scale.value = Math.min(8, Math.max(0.2, Math.round(next * 100) / 100));
        hits += 1;
      }
    } else if (key === "minecraft:movement" && value && typeof value === "object") {
      const movement = value as { value?: number };
      const next =
        patch.movement ??
        (typeof movement.value === "number" && patch.multiplyMovement ? movement.value * patch.multiplyMovement : undefined);
      if (next != null && typeof movement.value === "number") {
        movement.value = Math.min(0.6, Math.max(0, Math.round(next * 100) / 100));
        hits += 1;
      }
    } else {
      hits += patchTree(value, patch);
    }
  }
  if (patch.fireImmune && record["minecraft:entity"] && typeof record["minecraft:entity"] === "object") {
    const entity = record["minecraft:entity"] as { components?: Record<string, unknown> };
    entity.components ??= {};
    if (!entity.components["minecraft:fire_immune"]) {
      entity.components["minecraft:fire_immune"] = {};
      hits += 1;
    }
  }
  return hits;
}

function plan(request: string): { patch: Patch; note: string } | null {
  const text = request.toLowerCase();
  const patch: Patch = {};
  const notes: string[] = [];
  const healthSet = text.match(/(\d+)\s*(health|hp)\b/) ?? text.match(/\bhealth(?:\s+to)?\s+(\d+)/);
  const damageSet = text.match(/(\d+)\s*damage\b/) ?? text.match(/\bdamage(?:\s+to)?\s+(\d+)/);
  if (healthSet) {
    patch.health = Number(healthSet[1]);
    notes.push(`Health ${patch.health}`);
  } else if (/\b(double|twice)\b/.test(text) && /\b(strong|health|tough)\b/.test(text)) {
    patch.multiplyHealth = 2;
    notes.push("Health doubled");
  } else if (/\b(stronger|tougher)\b/.test(text)) {
    patch.multiplyHealth = 1.5;
    notes.push("Health up");
  }
  if (damageSet) {
    patch.damage = Number(damageSet[1]);
    notes.push(`Damage ${patch.damage}`);
  } else if (/\b(double|twice)\b/.test(text) && /\b(strong|damage)\b/.test(text)) {
    patch.multiplyDamage = 2;
    notes.push("Damage doubled");
  } else if (/\b(stronger|harder)\b/.test(text)) {
    patch.multiplyDamage = 1.5;
    notes.push("Damage up");
  }
  if (/\b(double|twice)\b/.test(text) && /\b(big|large|size)\b/.test(text)) {
    patch.multiplyScale = 2;
    notes.push("Size doubled");
  } else if (/\b(bigger|larger|huge)\b/.test(text)) {
    patch.multiplyScale = 1.5;
    notes.push("Bigger");
  } else if (/\b(smaller|tiny)\b/.test(text)) {
    patch.multiplyScale = 0.7;
    notes.push("Smaller");
  }
  if (/\bfaster\b/.test(text)) {
    patch.multiplyMovement = 1.5;
    notes.push("Faster");
  } else if (/\bslower\b/.test(text)) {
    patch.multiplyMovement = 0.75;
    notes.push("Slower");
  }
  if (/immune to fire|fire immune|fireproof/.test(text)) {
    patch.fireImmune = true;
    notes.push("Fire immune");
  }
  if (notes.length === 0) return null;
  return { patch, note: notes.join(". ") };
}

function targetsFor(request: string, creations: ImportedCreation[], targetIds?: string[]): ImportedCreation[] | { choices: { id: string; name: string }[] } {
  if (targetIds?.includes("all")) return creations;
  if (targetIds && targetIds.length > 0) {
    const picked = creations.filter((item) => targetIds.includes(item.id));
    if (picked.length > 0) return picked;
  }
  const text = request.toLowerCase();
  const ranked = creations
    .map((item) => {
      const name = item.name.toLowerCase();
      const words = name.split(/\s+/).filter((word) => word.length > 2);
      const score = (text.includes(name) ? 5 : 0) + words.filter((word) => text.includes(word)).length;
      return { item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return creations.length === 1 ? creations : { choices: creations.map((item) => ({ id: item.id, name: item.name })) };
  const best = ranked[0]!.score;
  const top = ranked.filter((item) => item.score === best).map((item) => item.item);
  if (top.length > 1 && !/\ball\b|\bevery\b/.test(text)) {
    return { choices: top.map((item) => ({ id: item.id, name: item.name })) };
  }
  return top;
}

export async function applyEdit(bytes: Uint8Array, request: string, filename = "addon.mcaddon", targetIds?: string[]): Promise<EditOutcome> {
  if (BLOCKED.test(request)) return { ok: false, error: "Only Minecraft changes." };
  const imported = await inspectArchive(bytes, filename);
  const planned = plan(request);
  if (!planned) {
    return {
      ok: false,
      error: "Anvil will not rebuild this add-on for that. It can change health, damage, size, speed, or add fire immunity, and leave every other file as it was.",
    };
  }
  if (imported.creations.length === 0) return { ok: false, error: "No editable mobs or items were found. Nothing was changed." };
  const targets = targetsFor(request, imported.creations, targetIds);
  if ("choices" in targets) return { ok: false, error: "Which one?", choices: targets.choices };

  const wanted = new Set(targets.flatMap((item) => item.files));
  const zip = await JSZip.loadAsync(bytes);
  const out = new JSZip();
  const changed: string[] = [];
  let unchanged = 0;
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    const path = safePath(file.name);
    if (!path) throw new Error("That archive has an unsafe file path.");
    const original = await file.async("uint8array");
    if (!wanted.has(path)) {
      out.file(path, original);
      unchanged += 1;
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(original));
    } catch {
      out.file(path, original);
      unchanged += 1;
      continue;
    }
    const before = JSON.stringify(parsed);
    const hits = patchTree(parsed, planned.patch);
    if (hits === 0 || JSON.stringify(parsed) === before) {
      out.file(path, original);
      unchanged += 1;
      continue;
    }
    out.file(path, `${JSON.stringify(parsed, null, 2)}\n`);
    changed.push(path);
  }
  if (changed.length === 0) return { ok: false, error: "That value was not in the selected file, so nothing was changed." };
  const packed = await out.generateAsync({ type: "uint8array" });
  const safeName = filename.replace(/\.(mcaddon|mcpack|zip)$/i, "").replace(/[^a-z0-9]+/gi, "") || "Addon";
  return {
    ok: true,
    bytes: packed,
    filename: `${safeName}_edited.mcaddon`,
    note: planned.note,
    changed,
    unchanged,
    preexisting: imported.preexisting,
    validation: ["Behaviour and resource files kept", "Identifiers left as they were", "Only the requested values changed"],
  };
}
