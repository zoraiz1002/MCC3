import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anon);

// Safe fallback so the app can render without envs; queries will no-op.
const isBrowser = typeof window !== "undefined";

export const supabase: SupabaseClient = createClient(
  url ?? "https://iuinahiweounsbpocfit.supabase.co",
  anon ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1aW5haGl3ZW91bnNicG9jZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Mjc0MDIsImV4cCI6MjA5ODQwMzQwMn0.BOrGM4t0_4SWMStEavJOisgCuS_6RDeOaOUN68_LCz8",
  {
    auth: {
      persistSession: isBrowser && isSupabaseConfigured,
      autoRefreshToken: isBrowser && isSupabaseConfigured,
      detectSessionInUrl: isBrowser && isSupabaseConfigured,
    },
  },
);
