import { createClient } from "@supabase/supabase-js";

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export const supabaseServerUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
export const supabaseServiceKey = env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SUPABASE_SECRET_KEY");

export const supabaseServerConfigured = Boolean(supabaseServerUrl && supabaseServiceKey);

export async function verifySupabaseAccessToken(
  accessToken: string | undefined,
): Promise<{ id: string; email: string | null } | null> {
  if (!supabaseServerConfigured || !accessToken || !supabaseServerUrl || !supabaseServiceKey) return null;
  const admin = createClient(supabaseServerUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
