import type { Spec } from "./types";

const COLORS: Record<string, [string, string, string]> = {
  red: ["#c4512c", "#3a2418", "#ffb15a"],
  blue: ["#3f7ea6", "#163246", "#d5f1ff"],
  purple: ["#6d5a8a", "#2c2438", "#c9b6e8"],
  green: ["#4e6b45", "#243024", "#d6e2a8"],
  gold: ["#e0b15a", "#6b4e22", "#fff1c9"],
  ice: ["#d5e6f2", "#6f93b0", "#f4fbff"],
  black: ["#2a2e36", "#121418", "#9aa4b8"],
  white: ["#f4f1ea", "#c8c2b8", "#fffaf2"],
  orange: ["#ff5a12", "#6b2a12", "#ffe7a0"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function directEdit(idea: string, current: Spec): { spec: Spec; note: string } | null {
  const text = idea.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const next = structuredClone(current);
  const notes: string[] = [];

  const health = text.match(/\b(\d+)\s*health\b/) ?? text.match(/\bhealth\s+(?:to\s+)?(\d+)\b/);
  if (health) {
    next.health = clamp(Number(health[1]), 1, next.type === "mob" ? 1000 : 500);
    notes.push(`Health ${next.health}`);
  }
  const damage = text.match(/\b(\d+)\s*damage\b/) ?? text.match(/\bdamage\s+(?:to\s+)?(\d+)\b/);
  if (damage) {
    next.damage = clamp(Number(damage[1]), 0, 40);
    notes.push(`Damage ${next.damage}`);
  }
  if (/\b(bigger|larger|huge|giant)\b/.test(text)) {
    next.scale = clamp(Math.round(next.scale * 1.4 * 100) / 100, 0.4, 4);
    notes.push("Larger");
  } else if (/\b(smaller|tiny|little)\b/.test(text)) {
    next.scale = clamp(Math.round(next.scale * 0.7 * 100) / 100, 0.4, 4);
    notes.push("Smaller");
  }
  for (const [name, colors] of Object.entries(COLORS)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      next.appearance = { ...next.appearance, primary: colors[0], secondary: colors[1], glow: colors[2] };
      notes.push(name);
      break;
    }
  }
  if (notes.length === 0) return null;
  const leftover = text
    .replace(/\b\d+\b/g, " ")
    .replace(/\b(health|damage|bigger|larger|huge|giant|smaller|tiny|little|make|set|change|give|it|the|to|a|an|its|and|colour|color|turn)\b/g, " ")
    .replace(new RegExp(`\\b(${Object.keys(COLORS).join("|")})\\b`, "g"), " ")
    .trim();
  if (leftover.length > 0) return null;
  return { spec: next, note: notes.join(". ") };
}
