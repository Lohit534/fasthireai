import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const createClient = () => {
  if (
    supabaseUrl.includes("placeholder-project") || 
    !supabaseAnonKey || 
    supabaseAnonKey === "placeholder-anon-key" || 
    supabaseAnonKey.trim() === ""
  ) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signUp: async (_credentials: any) => ({ data: { user: null, session: null }, error: new Error("Authentication service is initializing. Please try again.") }),
        signInWithPassword: async (_credentials: any) => ({ data: { user: null, session: null }, error: new Error("Invalid credentials or authentication service is initializing.") }),
        signInWithOAuth: async (_options: any) => ({ data: null, error: new Error("OAuth sign-in service is initializing.") }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: (callback: any) => {
          callback("SIGNED_OUT", null);
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: (_table: string) => {
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


