import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { libraryBrief, searchLibrary } from "./knowledge";
import { directEdit } from "./plan";
import { normalizeSpec, quoteCost } from "./spec";
import type { ForgeMode, Spec } from "./types";

const hits: number[] = [];

function allowCall(): boolean {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0]! > 10 * 60 * 1000) hits.shift();
  if (hits.length >= 20) return false;
  hits.push(now);
  return true;
}

const SYSTEM = `You are the planning engine for Anvil. You only make one Minecraft add-on (mob, item, block, or weapon).
Search the library brief first. Reuse the closest verified framework. Adapt it. Do not rebuild a working creature from scratch. Do not invent library names that are not in the brief.
If a current creation is provided, change only what was asked and keep health, attacks, movement, and shape unless the request changes them.
Never use profanity, sexual content, or slurs. Names and summaries stay suitable for everyone. If the request is not a Minecraft creation, or is sexual or profane, reply {"refused":true,"changeNote":"Only Minecraft add-ons."}
Otherwise reply with one JSON object only. Schema:
{"type":"mob"|"item"|"block"|"weapon","name":string,"summary":string,"health":number,"damage":number,"movementSpeed":number,"scale":number,"behavior":"hostile"|"neutral"|"passive","friendlyByDay":boolean,"silhouette":"humanoid"|"dragon"|"beast"|"blade"|"orb"|"block","spawn":{"where":string,"rarity":"common"|"uncommon"|"rare"|"legendary"},"drops":[{"item":string,"quantity":number,"chance":number}],"abilities":[{"name":string,"type":"projectile"|"summon"|"aura"|"melee"|"passive","detail":string,"cooldown":number,"damage":number,"range":number}],"appearance":{"material":string,"primary":"#hex","secondary":"#hex","glow":"#hex","notes":string},"sound":string,"animation":string,"versionLabel":string,"changeNote":string}
Constraints: health 1-1000 for mobs and 1-500 otherwise. damage 0-40. movementSpeed 0-0.45. scale 0.4-4. At most 3 abilities and 3 drops. chance is 0 to 1. Names are 1-3 words. summary is one short sentence. changeNote is under 12 words. Use specific colours, not grey.`;

const BLOCKED = /\b(fuck|shit|bitch|cunt|nigger|faggot|porn|xxx|nude|naked|sex|boobs|penis|vagina)\b/i;

async function remember(prompt: string, framework: string | undefined, modules: string[], status: string, cost: number) {
  try {
    const sql = await getSql();
    await sql`
      insert into generation_runs (edition, minecraft_version, original_prompt, selected_framework, retrieved_modules, final_status, coin_cost)
      values ('bedrock', '1.21', ${prompt.slice(0, 600)}, ${framework ?? null}, ${modules}, ${status}, ${cost})
    `;
  } catch {
    // The bundled library still guides generation when the tables are not connected.
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("The workshop reply was not usable.");
  }
}

type ShapeInput = {
  idea: string;
  mode: ForgeMode;
  current: Spec | null;
  priorCreations: number;
};

export const shapeIdea = createServerFn({ method: "POST" })
  .validator((input: ShapeInput) => {
    const idea = String(input?.idea ?? "").trim();
    if (!idea || idea.length > 600) throw new Error("Describe the change in a sentence or two.");
    const mode: ForgeMode = input?.mode === "edit" ? "edit" : "create";
    const priorCreations = Math.max(0, Math.min(500, Math.trunc(Number(input?.priorCreations ?? 0))));
    const current = input?.current && typeof input.current === "object" ? input.current : null;
    return { idea, mode, current, priorCreations };
  })
  .handler(async ({ data }) => {
    const cost = quoteCost(data.mode, data.idea, data.priorCreations);
    if (BLOCKED.test(data.idea)) {
      return { ok: false as const, error: "Only Minecraft add-ons.", cost: 0 };
    }
    const found = searchLibrary(data.idea);
    const framework = found.find((entry) => entry.kind === "framework")?.name;
    const modules = found.filter((entry) => entry.kind === "module").map((entry) => entry.name);
    if (data.mode === "edit" && data.current) {
      const edited = directEdit(data.idea, data.current);
      if (edited) {
        void remember(data.idea, framework, modules, "direct", cost);
        return {
          ok: true as const,
          spec: edited.spec,
          label: "Updated",
          note: edited.note,
          cost,
        };
      }
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Shaping is unavailable right now.", cost };
    }
    if (!allowCall()) {
      return { ok: false as const, error: "The workshop is busy. Wait a moment and try again.", cost };
    }

    const user = [
      `Library, use these and do not invent others:\n${libraryBrief(found)}`,
      `Mode: ${data.mode}`,
      `Idea: ${data.idea}`,
      `Current: ${data.current ? JSON.stringify(data.current) : "none"}`,
    ].join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(28000),
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.4,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        }),
      });
      if (!response.ok) {
        return { ok: false as const, error: "The workshop couldn't shape that just now.", cost };
      }
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = body.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(content) as { versionLabel?: string; changeNote?: string; refused?: boolean };
      if (parsed.refused) {
        void remember(data.idea, framework, modules, "refused", 0);
        return { ok: false as const, error: "Only Minecraft add-ons.", cost: 0 };
      }
      const spec = normalizeSpec(parsed, data.idea);
      const label = String(parsed.versionLabel ?? "").trim().slice(0, 48) || (data.mode === "create" ? `Original ${spec.name}` : "Updated");
      const note = String(parsed.changeNote ?? "").trim().slice(0, 180) || spec.summary;
      void remember(data.idea, framework, modules, "shaped", cost);
      return { ok: true as const, spec, label, note, cost };
    } catch {
      return { ok: false as const, error: "The workshop couldn't shape that just now.", cost };
    }
  });
