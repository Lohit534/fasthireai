/**
 * Supabase Admin Client — uses SUPABASE_SERVICE_ROLE_KEY
 *
 * This client bypasses Row Level Security and is for server-side API routes only.
 * It communicates via HTTPS (REST API) — NO direct Postgres TCP connection.
 * This means it works perfectly on Vercel without any IPv4/IPv6 add-on.
 *
 * NEVER expose this client to the browser.
 */
import { createClient } from "@supabase/supabase-js";

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || serviceKey === "placeholder-service-key" || serviceKey.trim() === "" || url.includes("placeholder-project")) {
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      upsert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      order: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain as any;
  }

  _adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
