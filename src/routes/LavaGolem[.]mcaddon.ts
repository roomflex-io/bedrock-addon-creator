import { createFileRoute } from "@tanstack/react-router";
import { EXAMPLES } from "@/lib/forge/examples";
import { normalizeSpec } from "@/lib/forge/spec";

export const Route = createFileRoute("/LavaGolem.mcaddon")({
  server: {
    handlers: {
      GET: async () => {
        const project = EXAMPLES[0];
        const spec = project.generationHistory[0]?.spec;
        if (!spec) return new Response("Missing creation", { status: 404 });
        const { buildZip } = await import("@/lib/forge/zip.server");
        const packed = await buildZip(normalizeSpec(spec, spec.name), project.packIds);
        const binary = atob(packed.base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        return new Response(body, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
