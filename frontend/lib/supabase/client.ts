import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const createClient = () => {
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
        signUp: async (credentials: any) => ({ data: { user: mockUser }, error: null }),
        signInWithPassword: async (credentials: any) => ({ data: { user: mockUser }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: (callback: any) => {
          callback("SIGNED_IN", { user: mockUser });
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: (table: string) => {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
              then: (callback: any) => callback({ data: [], error: null })
            }),
            order: () => Promise.resolve({ data: [], error: null }),
            then: (callback: any) => callback({ data: [], error: null })
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
          upsert: () => Promise.resolve({ data: null, error: null }),
        };
      }
    } as any;
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createClient();


