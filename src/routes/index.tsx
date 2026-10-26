import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { EXAMPLES, portraitFor } from "@/lib/forge/examples";
import { cachedPack, preloadSample, sharePack } from "@/lib/forge/save-client";
import { newId, quoteCost, STARTER_COINS } from "@/lib/forge/spec";
import { useForge } from "@/lib/forge/store";
import type { Project } from "@/lib/forge/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("Make me a giant lava golem with 300 health that throws fireballs.");
  const hydrated = useForge((state) => state.hydrated);
  const wallet = useForge((state) => state.wallet);
  const projects = useForge((state) => state.projects);
  const ready = Object.values(projects).filter((project) => project.generationHistory.length > 0).length;
  const cost = quoteCost("create", idea, hydrated ? ready : 0);
  const starterPending = hydrated && !wallet.starterGranted;
  const covered = wallet.coins + (starterPending ? STARTER_COINS : 0);

  function createFromIdea() {
    const trimmed = idea.trim();
    if (!trimmed) {
      toast("Describe something first.");
      return;
    }
    if (hydrated && covered < cost) {
      toast("Not enough coins for another creation.");
      return;
    }
    const id = newId();
    useForge.getState().stashPending(id, trimmed);
    void navigate({ to: "/create/$projectId", params: { projectId: id } });
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 md:pt-20">
        <p className="text-sm font-semibold tracking-wide text-ember">Minecraft Bedrock workshop</p>
        <h1 className="mt-3 font-display text-5xl text-fg md:text-6xl">Build anything you imagine for your world.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Describe it, spend 1 coin, preview the model, set health, damage, and spawn, then finalise.
        </p>
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            createFromIdea();
          }}
        >
          <label className="sr-only" htmlFor="idea">What do you want to make?</label>
          <textarea
            id="idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            className="h-36 w-full resize-none rounded-lg border border-line bg-raised px-4 py-4 text-lg outline-none focus:border-ember"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                className="rounded-full border border-line px-3 py-2 text-sm text-muted hover:text-fg"
                onClick={() => setIdea(example.idea)}
              >
                {example.generationHistory[0]?.spec.name}
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button type="submit" className="h-12 rounded-md bg-ember px-6 font-semibold text-ink">
              Create · {cost} coin
            </button>
            <p className="text-sm text-muted">
              {starterPending
                ? `First creation adds ${STARTER_COINS} coins, then uses 1.`
                : `Balance after ${Math.max(0, wallet.coins - cost)}`}
            </p>
          </div>
        </form>
      </main>
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-3xl">One from the bench</h2>
          <Link to="/discover" className="text-sm text-muted">See the others</Link>
        </div>
        {EXAMPLES[0] ? <ExampleCard project={EXAMPLES[0]} /> : null}
      </section>
    </div>
  );
}

export function openExample(example: Project, navigate: ReturnType<typeof useNavigate>, ownerId?: string) {
  const id = newId();
  const spec = example.generationHistory[0]?.spec;
  if (!spec) return;
  useForge.getState().beginProject(id, example.idea, ownerId);
  useForge.getState().pushGeneration(id, {
    label: `Original ${spec.name}`,
    note: spec.summary,
    source: "create",
    cost: 0,
    spec: structuredClone(spec),
  });
  void navigate({ to: "/create/$projectId", params: { projectId: id } });
}

function ExampleCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  const [saving, setSaving] = useState(false);
  const spec = project.generationHistory[0]?.spec;
  useEffect(() => {
    void preloadSample();
  }, []);
  if (!spec) return null;
  const portrait = portraitFor(spec.name);

  async function savePack() {
    const file = cachedPack("sample");
    if (!file) {
      void preloadSample();
      toast("Preparing the pack. Tap Share to Minecraft again.");
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
    <div className="rounded-lg border border-line bg-raised p-4">
      <button
        type="button"
        onClick={() => openExample(project, navigate, user?.id)}
        className="w-full text-left"
      >
        {portrait ? (
          <img src={portrait} alt="" className="mb-4 aspect-[4/3] w-full rounded-md object-cover" />
        ) : (
          <span className="mb-4 block h-10 rounded-md" style={{ background: spec.appearance.primary }} />
        )}
        <p className="font-display text-2xl">{spec.name}</p>
        <p className="mt-1 text-sm text-muted">{spec.summary}</p>
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void savePack()}
        className="mt-4 h-11 w-full rounded-md bg-ember font-semibold text-ink disabled:opacity-40"
      >
        {saving ? "Preparing…" : "Share to Minecraft"}
      </button>
      <p className="mt-2 text-sm text-muted">Share it, then tap Minecraft. In Creative, search Lava Golem Spawn Egg and use that to place it.</p>
    </div>
  );
}
