import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy browser client — only created when first called (not at module load)
let _client: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = "https://qasfeyddyolpdvmiogkl.supabase.co";

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  _client = createClient(url, key);
  return _client;
}

// Admin/server client using service role — created fresh per request
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-service-key";
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Thin proxy so client components can write `supabase.auth.xxx()`
// without creating the client at module scope
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
