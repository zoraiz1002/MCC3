import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anon);

// Safe fallback so the app can render without envs; queries will no-op.
const isBrowser = typeof window !== "undefined";

export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anon ?? "placeholder",
  {
    auth: {
      persistSession: isBrowser && isSupabaseConfigured,
      autoRefreshToken: isBrowser && isSupabaseConfigured,
      detectSessionInUrl: isBrowser && isSupabaseConfigured,
    },
  },
);
