import { createServerFn } from "@tanstack/react-start";
import { normalizeSpec, slugify } from "./spec";
import type { PackIds, Spec } from "./types";

type ExportInput = {
  spec: Spec;
  packIds: PackIds;
};

export const exportAddon = createServerFn({ method: "POST" })
  .validator((input: ExportInput) => {
    if (!input?.spec || !input.packIds?.behavior || !input.packIds.resource) {
      throw new Error("This project is not ready to pack.");
    }
    return {
      spec: normalizeSpec(input.spec, input.spec.name),
      packIds: input.packIds,
    };
  })
  .handler(async ({ data }) => {
    const { buildZip } = await import("./zip.server");
    return buildZip(data.spec, data.packIds);
  });

export function addonFilename(spec: Spec): string {
  const slug = slugify(spec.name).replace(/_/g, " ");
  const titled = slug.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\s+/g, "");
  return `${titled || "Anvil"}.mcaddon`;
}
