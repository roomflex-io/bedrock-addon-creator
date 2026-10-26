import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;

export const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || "";
export const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function supabaseUserId(user: User | null | undefined): string | null {
  return user?.id ?? null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
