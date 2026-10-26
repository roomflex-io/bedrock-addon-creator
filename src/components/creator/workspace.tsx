import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { runForge } from "@/lib/forge/actions";
import { cachedPack, preloadPayload, sharePack } from "@/lib/forge/save-client";
import { validateSpec } from "@/lib/forge/spec";
import { selectSpec, useForge } from "@/lib/forge/store";
import { CoinPill } from "@/components/coin-pill";
import { PreviewStage } from "@/components/creator/preview-stage";
import type { Rarity, Spec } from "@/lib/forge/types";

const SPAWNS = ["Overworld", "Nether", "The End", "Ocean", "Mountains", "Forest", "Desert"] as const;

export function Workspace({ projectId }: { projectId: string }) {
  const hydrated = useForge((state) => state.hydrated);
  const project = useForge((state) => state.projects[projectId]);
  const pendingIdea = useForge((state) => state.pending[projectId]);
  const patchSpec = useForge((state) => state.patchSpec);
  const takePending = useForge((state) => state.takePending);
  const { user, isPending } = useCurrentUserState();
  const accountReady = useForge((state) => state.accountReady);
  const [finalised, setFinalised] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"preview" | "chat">("preview");
  const [line, setLine] = useState("");
  const wallet = useForge((state) => state.wallet);
  const started = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!hydrated || !accountReady || isPending || started.current) return;
    started.current = true;
    const pending = takePending(projectId);
    const current = useForge.getState().projects[projectId];
    if (current && current.generationHistory.length > 0) return;
    const idea = pending ?? current?.idea;
    if (!idea) return;
    void runForge({
      projectId,
      idea,
      mode: "create",
      signedIn: Boolean(userRef.current),
      ownerId: userRef.current?.id,
    });
  }, [hydrated, accountReady, isPending, projectId, takePending]);

  useEffect(() => {
    if (!project) return;
    const currentSpec = selectSpec(project);
    if (!currentSpec || !validateSpec(currentSpec).ready) return;
    const payload = JSON.stringify({ spec: currentSpec, packIds: project.packIds });
    const name = `${currentSpec.name.replace(/[^A-Za-z0-9]+/g, "") || "Anvil"}.mcaddon`;
    const key = `${project.id}:${currentSpec.name}:${project.updatedAt}`;
    void preloadPayload(key, payload, name);
  }, [project]);

  if (!hydrated || (!project && pendingIdea)) {
    return <div className="grid min-h-dvh place-items-center text-muted">Opening the bench…</div>;
  }

  if (!project) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-3xl">This project is not on this bench.</p>
          <Link to="/" className="mt-4 inline-flex h-11 items-center text-ember">Back to the workshop</Link>
        </div>
      </div>
    );
  }

  const spec = selectSpec(project);
  const shaping = project.phase === "shaping" || !spec;
  const packName = `${(spec?.name ?? "Anvil").replace(/[^A-Za-z0-9]+/g, "") || "Anvil"}.mcaddon`;
  const packKey = spec ? `${project.id}:${spec.name}:${project.updatedAt}` : "";
  const packPayload = spec ? JSON.stringify({ spec, packIds: project.packIds }) : "";

  function setStat(mutate: (draft: Spec) => void) {
    patchSpec(projectId, (draft) => {
      mutate(draft);
      return draft;
    });
  }

  async function share() {
    const file = cachedPack(packKey);
    if (!file) {
      void preloadPayload(packKey, packPayload, packName);
      toast("Preparing the pack. Tap again.");
      return;
    }
    setSaving(true);
    try {
      await sharePack(file);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast(error instanceof Error ? error.message : "The pack could not be shared.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Link to="/" aria-label="Workshop" className="grid size-11 place-items-center rounded-md border border-line">
          <ChevronLeft className="size-4" />
        </Link>
        <Link to="/projects" className="text-sm text-muted">Creations</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg">{spec?.name ?? "Creating"}</p>
          <p className="truncate text-xs text-muted">{shaping ? "Making it" : finalised ? "Final" : "Preview"}</p>
        </div>
        <button type="button" className={`h-9 rounded-md px-3 text-sm ${view === "preview" ? "bg-surface" : "text-muted"}`} onClick={() => setView("preview")}>Preview</button>
        <button type="button" className={`h-9 rounded-md px-3 text-sm ${view === "chat" ? "bg-surface" : "text-muted"}`} onClick={() => setView("chat")}>Chat</button>
        <CoinPill />
      </header>

      <div className="min-h-0 flex-1">
        {view === "chat" ? (
          <div className="flex h-full flex-col">
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <li className="rounded-md bg-surface px-3 py-2 text-sm">{project.idea}</li>
              {project.generationHistory.map((entry) => (
                <li key={entry.id} className="rounded-md border border-line px-3 py-2 text-sm text-muted">{entry.note}</li>
              ))}
              {project.phaseMessage ? <li className="text-sm text-ember">{project.phaseMessage}</li> : null}
            </ul>
            <form
              className="flex gap-2 border-t border-line p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const text = line.trim();
                if (!text || text.length > 120) {
                  toast("One short line.");
                  return;
                }
                if (wallet.starterGranted && wallet.coins < 1) {
                  toast("Not enough coins.");
                  return;
                }
                setLine("");
                setView("preview");
                void runForge({
                  projectId,
                  idea: text,
                  mode: "edit",
                  signedIn: Boolean(user),
                  ownerId: user?.id,
                });
              }}
            >
              <input
                value={line}
                maxLength={120}
                placeholder="Make the wings bigger"
                onChange={(event) => setLine(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 outline-none focus:border-ember"
              />
              <button type="submit" disabled={shaping} className="h-11 shrink-0 rounded-md bg-ember px-3 text-sm font-semibold text-ink disabled:opacity-40">
                Change · 1 coin
              </button>
            </form>
          </div>
        ) : (
          <PreviewStage spec={spec ?? null} shaping={shaping} idea={project.idea} />
        )}
      </div>

      {shaping ? (
        <p className="border-t border-line px-4 py-5 text-center text-muted">Making it. This uses 1 coin.</p>
      ) : spec && !finalised ? (
        <form
          className="space-y-4 border-t border-line bg-raised px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            setFinalised(true);
          }}
        >
          <p className="text-sm text-muted">Health, damage, and spawn are free. Chat changes cost 1 coin.</p>
          <Range label="Health" min={1} max={spec.type === "mob" ? 1000 : 500} value={spec.health} onChange={(value) => setStat((draft) => { draft.health = value; })} />
          <Range label="Damage" min={0} max={40} value={spec.damage} onChange={(value) => setStat((draft) => { draft.damage = value; })} />
          <label className="block text-sm text-muted">
            Spawn type
            <select
              className="mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-fg outline-none focus:border-ember"
              value={spawnChoice(spec)}
              onChange={(event) => setStat((draft) => { draft.spawn.where = event.target.value; draft.spawn.rarity = rarityFor(event.target.value); })}
            >
              {SPAWNS.map((place) => (
                <option key={place} value={place}>{place}</option>
              ))}
              {SPAWNS.includes(spawnChoice(spec) as (typeof SPAWNS)[number]) ? null : <option value={spec.spawn.where}>{spec.spawn.where}</option>}
            </select>
          </label>
          <button type="submit" className="h-12 w-full rounded-md bg-ember font-semibold text-ink">
            Finalise
          </button>
        </form>
      ) : (
        <div className="space-y-3 border-t border-line bg-raised px-4 py-4">
          <p className="text-sm text-muted">{spec ? `${spec.name} · ${spec.health} health · ${spec.damage} damage · ${spec.spawn.where}` : "Ready"}</p>
          <button type="button" disabled={saving || !spec} onClick={() => void share()} className="h-12 w-full rounded-md bg-ember font-semibold text-ink disabled:opacity-40">
            {saving ? "Preparing…" : "Share to Minecraft"}
          </button>
          <button type="button" className="h-11 w-full text-sm text-muted" onClick={() => setFinalised(false)}>
            Change stats
          </button>
        </div>
      )}
    </div>
  );
}

function spawnChoice(spec: Spec): string {
  const where = spec.spawn.where.toLowerCase();
  const match = SPAWNS.find((place) => where.includes(place.toLowerCase()));
  return match ?? spec.spawn.where;
}

function rarityFor(place: string): Rarity {
  if (place === "The End" || place === "Nether") return "rare";
  if (place === "Mountains" || place === "Ocean") return "uncommon";
  return "common";
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm text-muted">
      <span className="flex justify-between"><span>{label}</span><span className="text-fg">{value}</span></span>
      <input className="mt-2 w-full accent-ember" type="range" min={min} max={max} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
