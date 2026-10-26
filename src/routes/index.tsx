import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { X } from "lucide-react";
import { AccountForm, PENDING_IDEA } from "@/components/account-form";
import { SiteHeader } from "@/components/site-header";
import { EXAMPLES, portraitFor } from "@/lib/forge/examples";
import { cachedPack, preloadSample, sharePack } from "@/lib/forge/save-client";
import { newId, quoteCost } from "@/lib/forge/spec";
import { useResumePendingIdea } from "@/lib/forge/resume";
import { useForge } from "@/lib/forge/store";
import type { Project } from "@/lib/forge/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { supabaseConfigured } from "@/lib/auth/supabase";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [needsAccount, setNeedsAccount] = useState(false);
  const hydrated = useForge((state) => state.hydrated);
  const wallet = useForge((state) => state.wallet);
  const { user, isPending } = useCurrentUserState();
  const signedIn = Boolean(user && !user.isDevFallback);
  const cost = quoteCost("create", idea, 0);
  useResumePendingIdea();

  function start(trimmed: string) {
    if (hydrated && wallet.coins < cost && wallet.starterGranted) {
      toast("Not enough coins.");
      return;
    }
    const id = newId();
    useForge.getState().stashPending(id, trimmed);
    void navigate({ to: "/create/$projectId", params: { projectId: id } });
  }

  function createFromIdea() {
    const trimmed = idea.trim();
    if (!trimmed) {
      toast("Say what you want. One line.");
      return;
    }
    if (trimmed.length > 120) {
      toast("Keep it to one short line.");
      return;
    }
    if (supabaseConfigured && !isPending && !signedIn) {
      localStorage.setItem(PENDING_IDEA, trimmed);
      setNeedsAccount(true);
      return;
    }
    start(trimmed);
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 md:pt-20">
        <p className="text-sm font-semibold tracking-wide text-ember">Minecraft workshop</p>
        <h1 className="mt-3 font-display text-5xl text-fg md:text-6xl">Build anything you imagine for your world.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">One line. Then hit Create.</p>
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            createFromIdea();
          }}
        >
          <p className="mb-3 text-2xl font-bold text-ember">First creation free</p>
          <label className="sr-only" htmlFor="idea">What do you want to make?</label>
          <input
            id="idea"
            value={idea}
            maxLength={120}
            placeholder="A flying dragon that breathes Fire"
            onChange={(event) => setIdea(event.target.value)}
            className="h-14 w-full rounded-lg border border-line bg-raised px-4 text-lg outline-none focus:border-ember"
          />
          <button type="submit" className="mx-auto mt-5 block h-12 w-full max-w-md rounded-md bg-ember font-semibold text-ink">
            Create
          </button>
        </form>
        {needsAccount ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <div className="relative w-full max-w-sm rounded-lg border border-line bg-raised p-5">
              <button
                type="button"
                aria-label="Close"
                className="absolute right-3 top-3 grid size-11 place-items-center rounded-md text-muted"
                onClick={() => {
                  localStorage.removeItem(PENDING_IDEA);
                  setNeedsAccount(false);
                }}
              >
                <X className="size-4" />
              </button>
              <div id="account-title">
                <AccountForm onSignedIn={() => start(idea.trim())} />
              </div>
            </div>
          </div>
        ) : null}
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
