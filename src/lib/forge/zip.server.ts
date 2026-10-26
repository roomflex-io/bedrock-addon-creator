import JSZip from "jszip";
import { buildTextFiles, texturePath } from "./pack";
import { isLavaGolem, lavaGolemTexture } from "./golem";
import { bytesToBase64, texturePng } from "./png";
import { slugify } from "./spec";
import type { PackIds, Spec } from "./types";

export async function buildZip(spec: Spec, packIds: PackIds): Promise<{ filename: string; base64: string }> {
  const zip = new JSZip();
  for (const file of buildTextFiles(spec, packIds)) {
    zip.file(file.path, file.text);
  }
  const png = isLavaGolem(spec)
    ? lavaGolemTexture()
    : texturePng(spec.appearance.primary, spec.appearance.secondary, spec.appearance.glow);
  zip.file(texturePath(spec), png);
  if (spec.type === "mob") {
    const slug = slugify(spec.name);
    zip.file(
      `resource_packs/${slug}_rp/textures/items/${slug}_spawn_egg.png`,
      texturePng(spec.appearance.glow, spec.appearance.primary, spec.appearance.secondary, 16),
    );
  }
  for (const drop of spec.drops) {
    const id = drop.item.trim().toLowerCase();
    const vanilla = ["coal", "diamond", "emerald", "iron", "gold", "gunpowder", "bone", "string", "leather", "arrow", "stick"];
    if (vanilla.some((name) => id === name || id.includes(name))) continue;
    const dropSlug = slugify(drop.item);
    const root = `behavior_packs/${slugify(spec.name)}_bp`;
    if (!zip.file(`${root}/items/${dropSlug}.json`)) continue;
    zip.file(
      `resource_packs/${slugify(spec.name)}_rp/textures/items/${dropSlug}.png`,
      texturePng(spec.appearance.glow, spec.appearance.secondary, spec.appearance.primary, 16),
    );
  }
  const base64 = await zip.generateAsync({ type: "base64" });
  const filename = `${spec.name.replace(/[^a-z0-9]+/gi, "") || "Anvil"}.mcaddon`;
  return { filename, base64: base64 || bytesToBase64(new Uint8Array()) };
}
