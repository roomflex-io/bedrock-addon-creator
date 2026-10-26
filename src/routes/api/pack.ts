import { createFileRoute } from "@tanstack/react-router";
import { EXAMPLES } from "@/lib/forge/examples";
import { normalizeSpec } from "@/lib/forge/spec";
import type { PackIds, Spec } from "@/lib/forge/types";

function jsonPack(base64: string, filename: string): Response {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "") || "Anvil.mcaddon";
  return new Response(JSON.stringify({ filename: safe, base64 }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function packResponse(spec: Spec, packIds: PackIds): Promise<Response> {
  const { buildZip } = await import("@/lib/forge/zip.server");
  const packed = await buildZip(normalizeSpec(spec, spec.name), packIds);
  return jsonPack(packed.base64, packed.filename);
}

export const Route = createFileRoute("/api/pack")({
  server: {
    handlers: {
      GET: async () => {
        const project = EXAMPLES[0];
        const spec = project.generationHistory[0]?.spec;
        if (!spec) return new Response("Missing creation", { status: 404 });
        return packResponse(spec, project.packIds);
      },
      POST: async ({ request }) => {
        const form = await request.formData();
        const raw = form.get("payload");
        if (typeof raw !== "string") return new Response("Missing pack", { status: 400 });
        let body: { spec?: Spec; packIds?: PackIds };
        try {
          body = JSON.parse(raw) as { spec?: Spec; packIds?: PackIds };
        } catch {
          return new Response("Bad pack", { status: 400 });
        }
        if (!body.spec || !body.packIds?.behavior || !body.packIds.resource) {
          return new Response("This project is not ready to pack.", { status: 400 });
        }
        return packResponse(body.spec, body.packIds);
      },
    },
  },
});
