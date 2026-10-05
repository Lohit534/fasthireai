import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy browser client — only created when first called (not at module load)
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  _client = createClient(url, key);
  return _client;
}

// Admin/server client using service role or bearer token — created fresh per request
export function getAdminClient(token?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || token || "placeholder-service-key";
  
  const options: any = {
    auth: { autoRefreshToken: false, persistSession: false },
  };

  if (token) {
    options.global = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  return createClient(url, serviceKey, options);
}

// Thin proxy so client components can write `supabase.auth.xxx()`
// without creating the client at module scope
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
