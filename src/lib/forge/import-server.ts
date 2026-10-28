import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { STARTER_COINS } from "./spec";
import { applyEdit, inspectArchive } from "./import";

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function readUpload(input: { base64?: string; filename?: string; permission?: boolean }) {
  if (input?.permission !== true) throw new Error("Confirm you have permission to edit this add-on.");
  const filename = String(input?.filename ?? "");
  if (!/\.(mcaddon|mcpack|zip)$/i.test(filename)) throw new Error("Upload a .mcaddon file.");
  const base64 = String(input?.base64 ?? "");
  if (!base64 || base64.length > 5_600_000) throw new Error("That add-on is over 4 MB.");
  return { filename, bytes: fromBase64(base64) };
}

export const inspectAddon = createServerFn({ method: "POST" })
  .validator(readUpload)
  .handler(async ({ data }) => {
    const imported = await inspectArchive(data.bytes, data.filename);
    return imported;
  });

async function takeCoin(userId: string): Promise<{ ok: true; coins: number } | { ok: false; coins: number }> {
  const sql = await getSql();
  const existing = await sql<{ starter_granted: boolean }>`select starter_granted from wallets where user_id = ${userId}`;
  if (!existing[0]) {
    await sql`
      insert into wallets (user_id, coins, grant_claimed, starter_granted)
      values (${userId}, ${STARTER_COINS}, false, true)
    `;
  } else if (!existing[0].starter_granted) {
    await sql`
      update wallets
      set coins = coins + ${STARTER_COINS}, starter_granted = true, updated_at = now()
      where user_id = ${userId} and starter_granted = false
    `;
  }
  const rows = await sql<{ coins: number }>`
    update wallets
    set coins = coins - 1, updated_at = now()
    where user_id = ${userId} and coins >= 1
    returning coins
  `;
  if (!rows[0]) {
    const current = await sql<{ coins: number }>`select coins from wallets where user_id = ${userId}`;
    return { ok: false, coins: Number(current[0]?.coins ?? 0) };
  }
  return { ok: true, coins: Number(rows[0].coins) };
}

export const editAddon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { base64?: string; filename?: string; permission?: boolean; request?: string; targetIds?: string[] }) => {
    const upload = readUpload(input);
    const request = String(input?.request ?? "").trim();
    if (!request || request.length > 300) throw new Error("Say what you want to change.");
    const targetIds = Array.isArray(input?.targetIds) ? input.targetIds.map(String).slice(0, 20) : undefined;
    return { ...upload, request, targetIds };
  })
  .handler(async ({ data, context }) => {
    const result = await applyEdit(data.bytes, data.request, data.filename, data.targetIds);
    if (!result.ok) return { ...result, coins: null as number | null };
    const paid = await takeCoin(context.userId);
    if (!paid.ok) return { ok: false as const, error: "Not enough coins. Nothing was changed.", coins: paid.coins };
    return {
      ok: true as const,
      base64: toBase64(result.bytes),
      filename: result.filename,
      note: result.note,
      changed: result.changed,
      unchanged: result.unchanged,
      preexisting: result.preexisting,
      validation: result.validation,
      coins: paid.coins,
    };
  });
