import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

export type Role = "admin" | "captain" | "player" | null;

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role;
  isAdmin: boolean;
  isCaptain: boolean;
  isPlayer: boolean;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, profile: null, role: null,
  isAdmin: false, isCaptain: false, isPlayer: false,
  loading: true, configured: false,
  signOut: async () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone,avatar_url").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? null);
    const list = (roles ?? []).map((r: any) => r.role as Role);
    if (list.includes("admin")) setRole("admin");
    else if (list.includes("captain")) setRole("captain");
    else setRole("player");
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await loadUserData(data.session.user.id);
    else { setProfile(null); setRole(null); }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) { setTimeout(() => loadUserData(s.user.id), 0); }
      else { setProfile(null); setRole(null); }
    });
    refresh().finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session, profile, role,
      isAdmin: role === "admin",
      isCaptain: role === "captain",
      isPlayer: role === "player",
      loading, configured: isSupabaseConfigured,
      signOut: async () => { await supabase.auth.signOut(); },
      refresh,
    }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
export const useCurrentUser = () => {
  const { user, profile, role, loading } = useAuth();
  return { user, profile, role, loading };
};
