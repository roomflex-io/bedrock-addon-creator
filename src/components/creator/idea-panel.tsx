import { useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { quoteCost } from "@/lib/forge/spec";
import { readyCount, useForge } from "@/lib/forge/store";
import type { Project } from "@/lib/forge/types";
import { validateSpec } from "@/lib/forge/spec";

type IdeaPanelProps = {
  project: Project;
  busy: boolean;
  onSubmit: (idea: string) => void;
  onBench: (idea: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRestore: (entryId: string) => void;
  onFix: (hint: string) => void;
  onFocus: (section: string) => void;
};

export function IdeaPanel({
  project,
  busy,
  onSubmit,
  onBench,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRestore,
  onFix,
  onFocus,
}: IdeaPanelProps) {
  const [idea, setIdea] = useState("");
  const wallet = useForge((state) => state.wallet);
  const accountReady = useForge((state) => state.accountReady);
  const spec = project.generationHistory.find((entry) => entry.id === project.currentId)?.spec;
  const cost = quoteCost("edit", idea || "change", readyCount());
  const afford = wallet.coins >= cost;
  const checks = spec ? validateSpec(spec) : null;
  const history = [...project.generationHistory].reverse();

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted">What should we change?</h2>
          <div className="flex gap-1">
            <button type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo} className="grid size-11 place-items-center rounded-md border border-line disabled:opacity-30">
              <Undo2 className="size-4" />
            </button>
            <button type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo} className="grid size-11 place-items-center rounded-md border border-line disabled:opacity-30">
              <Redo2 className="size-4" />
            </button>
          </div>
        </div>
        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Make him twice as big. Give him lightning. Change his skin to ice."
          className="h-32 w-full resize-none rounded-md border border-line bg-bg px-3 py-3 outline-none focus:border-ember"
        />
        <button
          type="button"
          disabled={busy || !idea.trim() || !afford || !accountReady}
          onClick={() => {
            onSubmit(idea);
            setIdea("");
          }}
          className="h-12 w-full rounded-md bg-ember font-semibold text-ink disabled:opacity-40"
        >
          {busy ? "Shaping…" : `Make change · ${cost} coin${cost === 1 ? "" : "s"}`}
        </button>
        <p className="text-sm text-muted">
          Balance after <span className="tabular-nums text-fg">{Math.max(0, wallet.coins - (idea.trim() ? cost : 0))}</span>
        </p>
        <button
          type="button"
          disabled={busy || !idea.trim()}
          onClick={() => {
            onBench(idea);
            setIdea("");
          }}
          className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Sketch this on the bench instead, free
        </button>
        {project.phase === "error" && project.phaseMessage ? (
          <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg">{project.phaseMessage}</p>
        ) : null}
        {project.phase === "ready" && project.phaseMessage ? (
          <p className="text-sm text-muted">{project.phaseMessage}</p>
        ) : null}
      </div>

      {checks ? (
        <ul className="space-y-2 border-b border-line px-4 py-3">
          {checks.checks.map((check) => (
            <li key={check.id} className="flex items-start justify-between gap-3 text-sm">
              <span className={check.ok ? "text-fg" : "text-ember"}>{check.ok ? "Ready" : "Needs a look"} · {check.label}</span>
              {!check.ok ? (
                <span className="flex shrink-0 gap-2">
                  <button type="button" className="text-ember" onClick={() => onFix(check.hint ?? check.label)}>Fix · 1 coin</button>
                  <button type="button" className="text-muted" onClick={() => onFocus(check.focus ?? "identity")}>By hand</button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted">Versions</h2>
        <ol className="mt-3 space-y-2">
          {history.map((entry, index) => {
            const current = entry.id === project.currentId;
            return (
              <li key={entry.id} className={`rounded-md border px-3 py-3 ${current ? "border-ember bg-surface" : "border-line"}`}>
                <p className="text-sm text-fg">
                  Version {history.length - index} · {entry.label}
                </p>
                <p className="mt-1 text-sm text-muted">{entry.note}</p>
                <p className="mt-1 text-xs text-faint">
                  {entry.cost > 0 ? `${entry.cost} coin${entry.cost === 1 ? "" : "s"}` : "Free"} · {entry.source}
                </p>
                {!current ? (
                  <button type="button" className="mt-2 text-sm text-ember" onClick={() => onRestore(entry.id)}>
                    Restore this version
                  </button>
                ) : (
                  <p className="mt-2 text-sm text-ember">Current</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
