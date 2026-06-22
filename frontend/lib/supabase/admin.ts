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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
      "Add them in Vercel Dashboard → Settings → Environment Variables."
    );
  }

  _adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
