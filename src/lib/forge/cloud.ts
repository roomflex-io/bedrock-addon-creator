import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Project } from "./types";
import { STARTER_COINS } from "./spec";

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true" || value === "1";
}

function asProject(value: unknown): Project | null {
  const payload = typeof value === "string" ? safeParse(value) : value;
  if (!payload || typeof payload !== "object") return null;
  const project = payload as Project;
  if (typeof project.id !== "string" || !Array.isArray(project.generationHistory)) return null;
  return project;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const syncAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { guestCoins?: number; guestGrantClaimed?: boolean; guestStarterGranted?: boolean }) => ({
    guestCoins: Math.max(0, Math.min(99, Math.trunc(Number(input?.guestCoins ?? 0)))),
    guestGrantClaimed: Boolean(input?.guestGrantClaimed),
    guestStarterGranted: Boolean(input?.guestStarterGranted),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ coins: number; grant_claimed: boolean; starter_granted: boolean }>`
      select coins, grant_claimed, starter_granted from wallets where user_id = ${context.userId}
    `;
    if (!existing[0]) {
      await sql`
        insert into wallets (user_id, coins, grant_claimed, starter_granted)
        values (${context.userId}, ${data.guestCoins}, ${data.guestGrantClaimed}, ${data.guestStarterGranted})
      `;
      return {
        coins: data.guestCoins,
        grantClaimed: data.guestGrantClaimed,
        starterGranted: data.guestStarterGranted,
      };
    }
    return {
      coins: Number(existing[0].coins),
      grantClaimed: asBool(existing[0].grant_claimed),
      starterGranted: asBool(existing[0].starter_granted),
    };
  });

export const listCloudProjects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ payload: unknown }>`
      select payload from projects where user_id = ${context.userId} order by updated_at desc
    `;
    return rows.map((row) => asProject(row.payload)).filter((project): project is Project => !!project);
  });

export const saveCloudProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Project) => {
    if (!input || typeof input.id !== "string" || input.id.length > 80) throw new Error("Missing project");
    const payload = JSON.stringify(input);
    if (payload.length > 180000) throw new Error("Project is too large");
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const payload = JSON.stringify(data);
    await sql`
      insert into projects (id, user_id, payload, updated_at)
      values (${data.id}, ${context.userId}, ${payload}::jsonb, now())
      on conflict (id) do update
      set payload = excluded.payload, updated_at = now()
      where projects.user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const deleteCloudProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => {
    const id = String(input?.id ?? "");
    if (!id || id.length > 80) throw new Error("Missing project");
    return { id };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from projects where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const spendCoins = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { amount: number }) => {
    if (input?.amount !== 1 && input?.amount !== 2) throw new Error("Unsupported coin amount");
    return { amount: input.amount as 1 | 2 };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ coins: number }>`
      update wallets
      set coins = coins - ${data.amount}, updated_at = now()
      where user_id = ${context.userId} and coins >= ${data.amount}
      returning coins
    `;
    if (!rows[0]) {
      const current = await sql<{ coins: number }>`select coins from wallets where user_id = ${context.userId}`;
      return { ok: false as const, coins: Number(current[0]?.coins ?? 0) };
    }
    return { ok: true as const, coins: Number(rows[0].coins) };
  });

export const grantStarter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ coins: number }>`
      update wallets
      set coins = coins + ${STARTER_COINS}, starter_granted = true, updated_at = now()
      where user_id = ${context.userId} and starter_granted = false
      returning coins
    `;
    if (!rows[0]) {
      const current = await sql<{ coins: number }>`
        select coins from wallets where user_id = ${context.userId}
      `;
      if (!current[0]) {
        await sql`
          insert into wallets (user_id, coins, grant_claimed, starter_granted)
          values (${context.userId}, ${STARTER_COINS}, false, true)
        `;
        return { ok: true as const, coins: STARTER_COINS };
      }
      return { ok: false as const, coins: Number(current[0].coins) };
    }
    return { ok: true as const, coins: Number(rows[0].coins) };
  });

export const claimGrant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ coins: number }>`
      update wallets
      set coins = coins + 8, grant_claimed = true, updated_at = now()
      where user_id = ${context.userId} and grant_claimed = false
      returning coins
    `;
    if (!rows[0]) {
      const current = await sql<{ coins: number }>`select coins from wallets where user_id = ${context.userId}`;
      return { ok: false as const, coins: Number(current[0]?.coins ?? 0) };
    }
    return { ok: true as const, coins: Number(rows[0].coins) };
  });
