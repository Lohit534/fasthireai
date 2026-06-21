import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient(useServiceRole = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseKey = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  if (supabaseUrl.includes("placeholder-project")) {
    const mockUser = {
      id: "demo-user-id",
      email: "demo@fasthire.ai",
      role: "authenticated",
      user_metadata: { full_name: "Demo Candidate" }
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        getSession: async () => ({ data: { session: { user: mockUser } }, error: null }),
        exchangeCodeForSession: async (code: string) => ({ data: { session: { user: mockUser } }, error: null }),
      }
    } as any;
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies();
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies();
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

