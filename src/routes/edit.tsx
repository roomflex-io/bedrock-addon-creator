import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { X } from "lucide-react";
import { AccountForm } from "@/components/account-form";
import { SiteHeader } from "@/components/site-header";
import { editAddon, inspectAddon } from "@/lib/forge/import-server";
import type { ImportedAddon } from "@/lib/forge/import";
import { sharePack } from "@/lib/forge/save-client";
import { useForge } from "@/lib/forge/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/edit")({ component: EditPage });

const STAGES = [
  "Reading add-on…",
  "Finding packs…",
  "Understanding entities…",
  "Reading behaviours…",
  "Reading appearance…",
  "Checking dependencies…",
];

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function fileFromBase64(filename: string, base64: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([buffer], filename, { type: "application/octet-stream" });
}

function EditPage() {
  const { user, isPending } = useCurrentUserState();
  const signedIn = Boolean(user && !user.isDevFallback);
  const [permission, setPermission] = useState(false);
  const [stage, setStage] = useState("Upload an add-on and tell Anvil what you want to change.");
  const [busy, setBusy] = useState(false);
  const [addon, setAddon] = useState<ImportedAddon | null>(null);
  const [archive, setArchive] = useState<{ filename: string; base64: string } | null>(null);
  const [original, setOriginal] = useState<{ filename: string; base64: string } | null>(null);
  const [request, setRequest] = useState("");
  const [choices, setChoices] = useState<{ id: string; name: string }[] | null>(null);
  const [result, setResult] = useState<{ filename: string; base64: string; note: string; unchanged: number; validation: string[]; preexisting: string[] } | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);

  async function readFile(file: File) {
    if (!permission) {
      toast("Confirm you have permission to edit this add-on.");
      return;
    }
    if (!/\.(mcaddon|mcpack|zip)$/i.test(file.name)) {
      toast("Upload a .mcaddon file.");
      return;
    }
    setBusy(true);
    setAddon(null);
    setResult(null);
    setChoices(null);
    let step = 0;
    setStage(STAGES[0]!);
    const timer = window.setInterval(() => {
      step = Math.min(step + 1, STAGES.length - 1);
      setStage(STAGES[step]!);
    }, 350);
    try {
      const base64 = toBase64(new Uint8Array(await file.arrayBuffer()));
      const imported = await inspectAddon({ data: { base64, filename: file.name, permission: true } });
      const packed = { filename: file.name, base64 };
      setArchive(packed);
      setOriginal(packed);
      setAddon(imported);
      setStage("Ready.");
    } catch (error) {
      setStage("Upload an add-on and tell Anvil what you want to change.");
      toast(error instanceof Error ? error.message : "That add-on could not be read.");
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  }

  async function change(targetIds?: string[], signed?: boolean) {
    if (!archive) return;
    const trimmed = request.trim();
    if (!trimmed) {
      toast("Say what you want to change.");
      return;
    }
    if (!signed && !isPending && !signedIn) {
      setNeedsAccount(true);
      return;
    }
    setBusy(true);
    try {
      const edited = await editAddon({
        data: { base64: archive.base64, filename: archive.filename, permission: true, request: trimmed, targetIds },
      });
      if (!edited.ok) {
        setChoices(edited.choices ?? null);
        toast(edited.error);
        return;
      }
      setChoices(null);
      setResult(edited);
      setArchive({ filename: edited.filename, base64: edited.base64 });
      if (typeof edited.coins === "number") {
        const wallet = useForge.getState().wallet;
        useForge.getState().setWallet({ coins: edited.coins, grantClaimed: wallet.grantClaimed, starterGranted: true });
      }
      toast(`${edited.note}. Used 1 coin.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "That change did not go through.";
      if (/unauthorized/i.test(message)) setNeedsAccount(true);
      else toast(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-sm text-muted">Back</Link>
        <h1 className="mt-3 font-display text-5xl">Upload an add-on</h1>
        <p className="mt-3 text-muted">{stage}</p>
        <label className="mt-6 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={permission}
            onChange={(event) => setPermission(event.target.checked)}
          />
          <span>I confirm that I have permission to edit this add-on.</span>
        </label>
        <label
          className="mt-4 grid h-36 cursor-pointer place-items-center rounded-lg border border-dashed border-line bg-raised text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void readFile(file);
          }}
        >
          <span>
            <span className="block font-semibold">Drop .mcaddon here</span>
            <span className="mt-1 block text-sm text-muted">or choose a file. Upload and reading are free.</span>
          </span>
          <input
            type="file"
            accept=".mcaddon,.mcpack,.zip,application/octet-stream"
            className="sr-only"
            disabled={!permission || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        {addon ? (
          <section className="mt-8 rounded-lg border border-line bg-raised p-4">
            <p className="text-sm font-semibold text-ember">Add-on imported</p>
            <h2 className="mt-1 font-display text-3xl">{addon.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {addon.creations.length} creations · {addon.textures} textures · {addon.recipes} recipes
              {addon.behaviorPacks ? " · Behaviour pack" : ""}
              {addon.resourcePacks ? " · Resource pack" : ""}
            </p>
            <ul className="mt-4 space-y-2">
              {addon.creations.map((creation) => (
                <li key={creation.id} className="text-sm">
                  <span className="font-semibold">{creation.name}</span>
                  <span className="text-muted">
                    {" "}
                    {creation.kind}
                    {creation.health != null ? ` · ${creation.health} health` : ""}
                    {creation.damage != null ? ` · ${creation.damage} damage` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {addon.preexisting.length > 0 ? (
              <p className="mt-3 text-sm text-muted">{addon.preexisting.length} files already had unreadable JSON. They will be kept as they were.</p>
            ) : null}
            <label className="mt-6 block font-display text-3xl" htmlFor="change">What would you like to change?</label>
            <textarea
              id="change"
              value={request}
              maxLength={300}
              placeholder="Make the dragon twice as strong."
              onChange={(event) => setRequest(event.target.value)}
              className="mt-3 h-28 w-full rounded-lg border border-line bg-bg px-4 py-3 outline-none focus:border-ember"
            />
            <p className="mt-2 text-sm text-muted">A change uses 1 coin. Reading, checks, and the download do not.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void change()}
              className="mt-4 h-12 w-full rounded-md bg-ember font-semibold text-ink disabled:opacity-40"
            >
              {busy ? "Working…" : "Change it"}
            </button>
            {choices ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {choices.map((choice) => (
                  <button key={choice.id} type="button" className="h-11 rounded-md border border-line px-3 text-sm" onClick={() => void change([choice.id])}>
                    {choice.name}
                  </button>
                ))}
                <button type="button" className="h-11 rounded-md border border-line px-3 text-sm" onClick={() => void change(["all"])}>
                  All of these
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
        {result ? (
          <section className="mt-6 rounded-lg border border-line bg-raised p-4">
            <h2 className="font-display text-3xl">Your add-on is ready.</h2>
            <p className="mt-2 text-sm text-muted">{result.note}. {result.unchanged} files were left untouched.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {result.validation.map((line) => (
                <li key={line}>✓ {line}</li>
              ))}
            </ul>
            {result.preexisting.length > 0 ? (
              <p className="mt-3 text-sm text-muted">{result.preexisting.length} issues already existed in this add-on before editing.</p>
            ) : null}
            <button
              type="button"
              className="mt-4 h-12 w-full rounded-md bg-ember font-semibold text-ink"
              onClick={() => void sharePack(fileFromBase64(result.filename, result.base64)).catch((error: unknown) => {
                toast(error instanceof Error ? error.message : "The pack could not be shared.");
              })}
            >
              Share to Minecraft
            </button>
            <button
              type="button"
              className="mt-2 h-11 w-full rounded-md border border-line text-sm"
              onClick={() => {
                if (!original) return;
                setArchive(original);
                setResult(null);
                setRequest("");
              }}
            >
              Restore original
            </button>
          </section>
        ) : null}
        {needsAccount ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true">
            <div className="relative w-full max-w-sm rounded-lg border border-line bg-raised p-5">
              <button type="button" aria-label="Close" className="absolute right-3 top-3 grid size-11 place-items-center text-muted" onClick={() => setNeedsAccount(false)}>
                <X className="size-4" />
              </button>
              <AccountForm onSignedIn={() => {
                setNeedsAccount(false);
                void change(undefined, true);
              }} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
