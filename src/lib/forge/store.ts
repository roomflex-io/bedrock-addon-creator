import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId, STARTER_COINS } from "./spec";
import type { GenerationEntry, Project, Spec, Wallet } from "./types";

type UndoStack = { past: Spec[]; future: Spec[] };

type ForgeState = {
  projects: Record<string, Project>;
  wallet: Wallet;
  pending: Record<string, string>;
  undo: Record<string, UndoStack>;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  accountReady: boolean;
  setAccountReady: (value: boolean) => void;
  stashPending: (id: string, idea: string) => void;
  takePending: (id: string) => string | undefined;
  beginProject: (id: string, idea: string, ownerId?: string) => void;
  setPhase: (id: string, phase: Project["phase"], message?: string) => void;
  pushGeneration: (id: string, entry: Omit<GenerationEntry, "id" | "createdAt">) => void;
  restoreGeneration: (id: string, entryId: string) => void;
  patchSpec: (id: string, mutate: (spec: Spec) => Spec) => void;
  undoSpec: (id: string) => void;
  redoSpec: (id: string) => void;
  canUndo: (id: string) => boolean;
  canRedo: (id: string) => boolean;
  setWallet: (wallet: Wallet) => void;
  spendLocal: (amount: number) => boolean;
  grantStarterLocal: () => boolean;
  claimGrantLocal: () => boolean;
  removeProject: (id: string) => void;
  claimOwner: (userId: string) => void;
  mergeRemote: (projects: Project[]) => void;
};

function currentSpec(project: Project | undefined): Spec | undefined {
  if (!project) return undefined;
  return project.generationHistory.find((entry) => entry.id === project.currentId)?.spec;
}

function touch(project: Project, spec: Spec): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    phase: "ready",
    phaseMessage: undefined,
    generationHistory: project.generationHistory.map((entry) =>
      entry.id === project.currentId ? { ...entry, spec } : entry,
    ),
  };
}

export const useForge = create<ForgeState>()(
  persist(
    (set, get) => ({
      projects: {},
      wallet: { coins: 0, grantClaimed: false, starterGranted: false },
      pending: {},
      undo: {},
      hydrated: false,
      accountReady: false,
      setHydrated: (value) => set({ hydrated: value }),
      setAccountReady: (value) => set({ accountReady: value }),
      stashPending: (id, idea) => set((state) => ({ pending: { ...state.pending, [id]: idea } })),
      takePending: (id) => {
        const idea = get().pending[id];
        if (!idea) return undefined;
        set((state) => {
          const pending = { ...state.pending };
          delete pending[id];
          return { pending };
        });
        return idea;
      },
      beginProject: (id, idea, ownerId) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [id]: {
              id,
              idea,
              ownerId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              phase: "shaping",
              generationHistory: [],
              currentId: "",
              packIds: {
                behavior: newId(),
                resource: newId(),
                behaviorModule: newId(),
                resourceModule: newId(),
              },
            },
          },
        })),
      setPhase: (id, phase, message) =>
        set((state) => {
          const project = state.projects[id];
          if (!project) return state;
          return {
            projects: {
              ...state.projects,
              [id]: { ...project, phase, phaseMessage: message, updatedAt: new Date().toISOString() },
            },
          };
        }),
      pushGeneration: (id, entry) =>
        set((state) => {
          const project = state.projects[id];
          if (!project) return state;
          const next: GenerationEntry = {
            ...entry,
            id: newId(),
            createdAt: new Date().toISOString(),
          };
          const generationHistory = [...project.generationHistory, next].slice(-40);
          const undo = { ...state.undo, [id]: { past: [], future: [] } };
          return {
            undo,
            projects: {
              ...state.projects,
              [id]: {
                ...project,
                phase: "ready",
                phaseMessage: undefined,
                generationHistory,
                currentId: next.id,
                updatedAt: next.createdAt,
              },
            },
          };
        }),
      restoreGeneration: (id, entryId) =>
        set((state) => {
          const project = state.projects[id];
          const source = project?.generationHistory.find((entry) => entry.id === entryId);
          if (!project || !source) return state;
          const next: GenerationEntry = {
            id: newId(),
            label: `Restored ${source.label}`,
            note: `Brought back “${source.label}”.`,
            createdAt: new Date().toISOString(),
            source: "restore",
            cost: 0,
            spec: structuredClone(source.spec),
          };
          return {
            undo: { ...state.undo, [id]: { past: [], future: [] } },
            projects: {
              ...state.projects,
              [id]: {
                ...project,
                phase: "ready",
                generationHistory: [...project.generationHistory, next].slice(-40),
                currentId: next.id,
                updatedAt: next.createdAt,
              },
            },
          };
        }),
      patchSpec: (id, mutate) =>
        set((state) => {
          const project = state.projects[id];
          const spec = currentSpec(project);
          if (!project || !spec) return state;
          const next = mutate(structuredClone(spec));
          const stack = state.undo[id] ?? { past: [], future: [] };
          return {
            undo: {
              ...state.undo,
              [id]: { past: [...stack.past, spec].slice(-30), future: [] },
            },
            projects: { ...state.projects, [id]: touch(project, next) },
          };
        }),
      undoSpec: (id) =>
        set((state) => {
          const project = state.projects[id];
          const spec = currentSpec(project);
          const stack = state.undo[id];
          if (!project || !spec || !stack || stack.past.length === 0) return state;
          const previous = stack.past[stack.past.length - 1]!;
          return {
            undo: {
              ...state.undo,
              [id]: { past: stack.past.slice(0, -1), future: [...stack.future, spec] },
            },
            projects: { ...state.projects, [id]: touch(project, previous) },
          };
        }),
      redoSpec: (id) =>
        set((state) => {
          const project = state.projects[id];
          const spec = currentSpec(project);
          const stack = state.undo[id];
          if (!project || !spec || !stack || stack.future.length === 0) return state;
          const next = stack.future[stack.future.length - 1]!;
          return {
            undo: {
              ...state.undo,
              [id]: { past: [...stack.past, spec], future: stack.future.slice(0, -1) },
            },
            projects: { ...state.projects, [id]: touch(project, next) },
          };
        }),
      canUndo: (id) => (get().undo[id]?.past.length ?? 0) > 0,
      canRedo: (id) => (get().undo[id]?.future.length ?? 0) > 0,
      setWallet: (wallet) => set({ wallet }),
      spendLocal: (amount) => {
        const wallet = get().wallet;
        if (wallet.coins < amount) return false;
        set({ wallet: { ...wallet, coins: wallet.coins - amount } });
        return true;
      },
      grantStarterLocal: () => {
        const wallet = get().wallet;
        if (wallet.starterGranted) return false;
        set({ wallet: { ...wallet, coins: wallet.coins + STARTER_COINS, starterGranted: true } });
        return true;
      },
      claimGrantLocal: () => {
        const wallet = get().wallet;
        if (wallet.grantClaimed) return false;
        set({ wallet: { ...wallet, coins: wallet.coins + 8, grantClaimed: true } });
        return true;
      },
      claimOwner: (userId) =>
        set((state) => {
          const projects = { ...state.projects };
          const now = new Date().toISOString();
          for (const id of Object.keys(projects)) {
            const project = projects[id];
            if (!project || project.ownerId) continue;
            projects[id] = { ...project, ownerId: userId, updatedAt: now };
          }
          return { projects };
        }),
      removeProject: (id) =>
        set((state) => {
          const projects = { ...state.projects };
          delete projects[id];
          const undo = { ...state.undo };
          delete undo[id];
          return { projects, undo };
        }),
      mergeRemote: (incoming) =>
        set((state) => {
          const projects = { ...state.projects };
          for (const remote of incoming) {
            const local = projects[remote.id];
            if (!local || remote.updatedAt > local.updatedAt) projects[remote.id] = remote;
          }
          return { projects };
        }),
    }),
    {
      name: "anvil.v1",
      version: 1,
      skipHydration: true,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") return persisted as never;
        const state = persisted as { wallet?: Partial<Wallet> };
        const wallet = state.wallet ?? {};
        const coins = typeof wallet.coins === "number" ? wallet.coins : 0;
        const grantClaimed = Boolean(wallet.grantClaimed);
        if (version < 1 || typeof wallet.starterGranted !== "boolean") {
          const untouched = coins === 12 && !grantClaimed;
          state.wallet = untouched
            ? { coins: 0, grantClaimed: false, starterGranted: false }
            : { coins, grantClaimed, starterGranted: true };
        }
        return state;
      },
      partialize: (state) => ({
        projects: state.projects,
        wallet: state.wallet,
        pending: state.pending,
      }),
    },
  ),
);

export function readyCount(): number {
  return Object.values(useForge.getState().projects).filter((project) => project.generationHistory.length > 0).length;
}

export function selectProject(id: string): Project | undefined {
  return useForge.getState().projects[id];
}

export function selectSpec(project: Project | undefined): Spec | undefined {
  if (!project) return undefined;
  return project.generationHistory.find((entry) => entry.id === project.currentId)?.spec;
}
