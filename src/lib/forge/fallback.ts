import { guessKind, newId, normalizeSpec, paletteFor, titleFromIdea } from "./spec";
import type { Ability, AbilityType, Behavior, Rarity, Spec } from "./types";

function readNumber(idea: string, word: string): number | undefined {
  const match = idea.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${word}`, "i"));
  if (!match?.[1]) return undefined;
  return Number(match[1]);
}

function abilityFrom(idea: string): Ability | null {
  const hay = idea.toLowerCase();
  let type: AbilityType | null = null;
  let name = "Special";
  if (/\b(fireball|flame|fire bolt|shoots|throws)\b/.test(hay)) {
    type = "projectile";
    name = hay.includes("fire") ? "Fireball" : "Ranged attack";
  } else if (/\b(summon|spawn|calls)\b/.test(hay)) {
    type = "summon";
    name = "Summon";
  } else if (/\b(lightning|shock|thunder)\b/.test(hay)) {
    type = "projectile";
    name = "Lightning strike";
  } else if (/\b(freeze|frost|ice)\b/.test(hay) && /\b(sword|slash|attack)\b/.test(hay)) {
    type = "melee";
    name = "Freezing slash";
  } else if (/\b(aura|burn|poison|glow)\b/.test(hay)) {
    type = "aura";
    name = "Aura";
  }
  if (!type) return null;
  return {
    id: newId(),
    name,
    type,
    detail: idea.trim().slice(0, 160),
    cooldown: 4,
    damage: readNumber(idea, "damage") ?? 8,
    range: type === "melee" ? 3 : 16,
  };
}

function rarityFor(idea: string): Rarity {
  const hay = idea.toLowerCase();
  if (/\b(legendary|mythic|boss)\b/.test(hay)) return "legendary";
  if (/\b(rare)\b/.test(hay)) return "rare";
  if (/\b(common)\b/.test(hay)) return "common";
  return "uncommon";
}

function behaviorFor(idea: string, type: Spec["type"]): Behavior {
  const hay = idea.toLowerCase();
  if (/\b(friendly|tame|passive|helpful)\b/.test(hay)) return "passive";
  if (/\b(neutral)\b/.test(hay)) return "neutral";
  if (type !== "mob") return "passive";
  return "hostile";
}

export function benchShape(idea: string, current: Spec | null): { spec: Spec; label: string; note: string } {
  const text = idea.trim();
  const hay = text.toLowerCase();
  const base = current ? structuredClone(current) : normalizeSpec({ type: guessKind(text) }, text);
  const [primary, secondary, glow] = paletteFor(`${text} ${base.appearance.material}`);

  if (!current) {
    base.name = titleFromIdea(text);
    base.summary = text.replace(/\s+/g, " ").slice(0, 220);
    base.behavior = behaviorFor(text, base.type);
    base.spawn.rarity = rarityFor(text);
    base.appearance.primary = primary;
    base.appearance.secondary = secondary;
    base.appearance.glow = glow;
    const ability = abilityFrom(text);
    if (ability) base.abilities = [ability];
    if (/\b(lava|fire|flame)\b/.test(hay)) base.appearance.material = "cracked lava stone";
    else if (/\bice|frost|frozen\b/.test(hay)) base.appearance.material = "packed ice";
    else if (/\blightning|thunder\b/.test(hay)) base.appearance.material = "storm glass";
    else if (/\bmoss|leaf|forest\b/.test(hay)) base.appearance.material = "mossy stone";
  }

  const health = readNumber(text, "health");
  if (health) base.health = health;
  const damage = readNumber(text, "damage");
  if (damage) base.damage = damage;

  if (/\b(twice as big|two times bigger|much bigger)\b/.test(hay)) base.scale = Math.min(4, base.scale * 2);
  else if (/\b(giant|huge|massive|colossal)\b/.test(hay)) base.scale = Math.max(base.scale, 2.2);
  else if (/\b(tiny|small)\b/.test(hay)) base.scale = 0.6;

  if (/\b(twice as (much )?health|double (its |the )?health)\b/.test(hay)) base.health = Math.min(1000, base.health * 2);
  if (/\b(faster)\b/.test(hay)) base.movementSpeed = Math.min(0.45, base.movementSpeed + 0.08);
  if (/\b(slower)\b/.test(hay)) base.movementSpeed = Math.max(0, base.movementSpeed - 0.08);
  if (/\b(friendly|tame)\b/.test(hay)) base.behavior = "passive";
  if (/\b(hostile|angry|aggressive)\b/.test(hay)) base.behavior = "hostile";
  if (/\b(during the day|by day)\b/.test(hay) && /\b(friendly|calm|passive)\b/.test(hay)) {
    base.friendlyByDay = true;
    base.behavior = "hostile";
  }

  if (/\b(ice|frost)\b/.test(hay)) {
    base.appearance.primary = paletteFor("ice")[0];
    base.appearance.secondary = paletteFor("ice")[1];
    base.appearance.glow = paletteFor("ice")[2];
    base.appearance.material = "packed ice";
    base.appearance.notes = "Cold surface with a pale inner light.";
  }
  if (/\b(lava|obsidian)\b/.test(hay) && /\b(skin|texture|look|appearance)\b/.test(hay)) {
    const colors = paletteFor("obsidian");
    base.appearance.primary = colors[0];
    base.appearance.secondary = colors[1];
    base.appearance.glow = colors[2];
    base.appearance.notes = "Cracked obsidian with lava showing through.";
    base.appearance.material = "cracked obsidian";
  }

  if (current) {
    const extra = abilityFrom(text);
    if (extra && !base.abilities.some((item) => item.name === extra.name)) {
      base.abilities = [...base.abilities, extra].slice(0, 4);
    }
  }

  if (/\b(drop|drops)\b/.test(hay)) {
    const named = text.match(/\bdrops?\s+(?:a|an|some)?\s*([a-z][a-z\s]{2,24})/i);
    if (named?.[1]) {
      base.drops = [
        ...base.drops,
        { id: newId(), item: named[1].trim(), quantity: 1, chance: 0.6 },
      ].slice(0, 4);
    }
  }

  const spec = normalizeSpec(base, text);
  const label = current ? text.replace(/\s+/g, " ").slice(0, 42) : `Original ${spec.name}`;
  return {
    spec,
    label: label || spec.name,
    note: current ? "Sketched on the bench from your note." : "Sketched on the bench from your idea.",
  };
}
