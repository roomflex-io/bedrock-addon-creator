import { shapeIdea } from "./ai";
import { benchShape } from "./fallback";
import { grantStarter, spendCoins } from "./cloud";
import { selectSpec, useForge } from "./store";
import { STARTER_COINS } from "./spec";
import type { ForgeMode } from "./types";
import { toast } from "sonner";

const inflight = new Set<string>();

export function forgeBusy(projectId: string): boolean {
  return inflight.has(projectId);
}

async function charge(amount: 1 | 2, signedIn: boolean): Promise<boolean> {
  if (!signedIn) return useForge.getState().spendLocal(amount);
  const spent = await spendCoins({ data: { amount } });
  const wallet = useForge.getState().wallet;
  useForge.getState().setWallet({
    coins: spent.coins,
    grantClaimed: wallet.grantClaimed,
    starterGranted: wallet.starterGranted,
  });
  return spent.ok;
}

async function ensureStarter(signedIn: boolean): Promise<boolean> {
  const wallet = useForge.getState().wallet;
  if (wallet.starterGranted) return false;
  if (!signedIn) return useForge.getState().grantStarterLocal();
  const result = await grantStarter();
  const current = useForge.getState().wallet;
  useForge.getState().setWallet({
    coins: result.coins,
    grantClaimed: current.grantClaimed,
    starterGranted: true,
  });
  return result.ok;
}

function spendLine(cost: number, credited: boolean): string {
  const used = cost === 1 ? "Used 1 coin." : `Used ${cost} coins.`;
  return credited ? `${STARTER_COINS} coins added. ${used}` : used;
}

export async function runForge(options: {
  projectId: string;
  idea: string;
  mode: ForgeMode;
  signedIn: boolean;
  ownerId?: string;
}): Promise<void> {
  const { projectId, idea, mode, signedIn, ownerId } = options;
  const trimmed = idea.trim();
  if (!trimmed || inflight.has(projectId)) return;
  inflight.add(projectId);
  const store = useForge.getState();
  if (!store.projects[projectId]) store.beginProject(projectId, trimmed, ownerId);
  else store.setPhase(projectId, "shaping");

  try {
    const prior = Object.values(useForge.getState().projects).filter(
      (project) => project.id !== projectId && project.generationHistory.length > 0,
    ).length;
    const current =
      mode === "edit" ? (selectSpec(useForge.getState().projects[projectId]) ?? null) : null;
    const result = await shapeIdea({
      data: { idea: trimmed, mode, current, priorCreations: prior },
    });

    if (!result.ok) {
      if (result.error.startsWith("Only Minecraft")) {
        useForge.getState().setPhase(projectId, "error", result.error);
        toast(result.error);
        return;
      }
      if (mode === "create") {
        const bench = benchShape(trimmed, null);
        useForge.getState().pushGeneration(projectId, {
          label: bench.label,
          note: bench.note,
          source: "bench",
          cost: 0,
          spec: bench.spec,
        });
        useForge.getState().setPhase(
          projectId,
          "ready",
          "Sketched on the bench. Live shaping missed, so this one did not cost a coin.",
        );
        return;
      }
      useForge.getState().setPhase(projectId, "error", result.error);
      return;
    }

    if (result.cost > 0) {
      const credited = mode === "create" ? await ensureStarter(signedIn) : false;
      const amount = result.cost >= 2 ? 2 : 1;
      const paid = await charge(amount, signedIn);
      if (!paid) {
        useForge.getState().setPhase(
          projectId,
          "error",
          credited
            ? `${STARTER_COINS} coins added, but that was not enough. Nothing was changed.`
            : "Not enough coins. Nothing was changed.",
        );
        return;
      }
      useForge.getState().pushGeneration(projectId, {
        label: result.label,
        note: result.note,
        source: mode === "create" ? "create" : "auto",
        cost: result.cost,
        spec: result.spec,
      });
      const message = spendLine(result.cost, credited);
      useForge.getState().setPhase(projectId, "ready", message);
      toast(message);
      return;
    }

    useForge.getState().pushGeneration(projectId, {
      label: result.label,
      note: result.note,
      source: mode === "create" ? "create" : "auto",
      cost: result.cost,
      spec: result.spec,
    });
  } catch {
    if (mode === "create" && (useForge.getState().projects[projectId]?.generationHistory.length ?? 0) === 0) {
      const bench = benchShape(trimmed, null);
      useForge.getState().pushGeneration(projectId, {
        label: bench.label,
        note: bench.note,
        source: "bench",
        cost: 0,
        spec: bench.spec,
      });
      return;
    }
    const project = useForge.getState().projects[projectId];
    if (project?.phase === "shaping") {
      useForge.getState().setPhase(projectId, project.generationHistory.length ? "error" : "error", "The workshop couldn't finish that.");
    }
  } finally {
    inflight.delete(projectId);
  }
}

export function applyBench(projectId: string, idea: string): void {
  const current = selectSpec(useForge.getState().projects[projectId]) ?? null;
  const bench = benchShape(idea, current);
  useForge.getState().pushGeneration(projectId, {
    label: bench.label,
    note: bench.note,
    source: "bench",
    cost: 0,
    spec: bench.spec,
  });
}
