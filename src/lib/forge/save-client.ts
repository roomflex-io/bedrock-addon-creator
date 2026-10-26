const cache = new Map<string, File>();
const pending = new Map<string, Promise<File>>();

function previewBlocksDownload(): boolean {
  if (typeof window === "undefined") return true;
  if (window.parent !== window) return true;
  const host = location.hostname.toLowerCase();
  return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]";
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function asFile(filename: string, bytes: Uint8Array): File {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const safe = filename.toLowerCase().endsWith(".mcaddon") ? filename : `${filename}.mcaddon`;
  return new File([buffer], safe, { type: "application/octet-stream" });
}

async function readPack(response: Response, fallbackName: string): Promise<File> {
  if (!response.ok) throw new Error("The pack could not be assembled.");
  const payload = (await response.json()) as { filename?: string; base64?: string };
  if (!payload.base64) throw new Error("The pack could not be assembled.");
  return asFile(payload.filename || fallbackName, bytesFromBase64(payload.base64));
}

function remember(key: string, load: () => Promise<File>) {
  const existing = pending.get(key);
  if (existing) return existing;
  const task = load()
    .then((file) => {
      cache.set(key, file);
      return file;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export function cachedPack(key: string): File | null {
  return cache.get(key) ?? null;
}

export function preloadSample() {
  return remember("sample", async () => {
    const response = await fetch("/api/pack");
    return readPack(response, "LavaGolem.mcaddon");
  });
}

export function preloadPayload(key: string, payload: string, fallbackName: string) {
  return remember(key, async () => {
    const body = new URLSearchParams({ payload });
    const response = await fetch("/api/pack", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return readPack(response, fallbackName);
  });
}

export async function sharePack(file: File) {
  const data = { files: [file], title: file.name.replace(/\.mcaddon$/i, "") };
  const canShare =
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(data));
  if (canShare) {
    await navigator.share(data);
    return;
  }
  if (previewBlocksDownload()) {
    throw new Error("Tap the button again. If no share sheet appears, press and hold the 18 KB file, tap Share, then Minecraft.");
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
