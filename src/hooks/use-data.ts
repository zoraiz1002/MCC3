import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const usePlayers = () =>
  useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*, team_players(team_id, teams(id,name,short_name))")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useTeams = () =>
  useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, team_players(player_id), captain:players!teams_captain_id_fkey(id,full_name)")
        .eq("is_active", true)
        .order("name");
      if (error) {
        // fallback without captain join if FK alias differs
        const { data: d2, error: e2 } = await supabase.from("teams").select("*, team_players(player_id)").eq("is_active", true).order("name");
        if (e2) throw e2;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

export const useTournaments = () =>
  useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useMatches = (filters?: { status?: string; tournamentId?: string; limit?: number }) =>
  useQuery({
    queryKey: ["matches", filters],
    queryFn: async () => {
      let q = supabase
        .from("matches")
        .select("*, tournament:tournaments(id,name), a:teams!matches_team_a_fkey(id,name,short_name,badge_url), b:teams!matches_team_b_fkey(id,name,short_name,badge_url)")
        .order("match_date", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.tournamentId) q = q.eq("tournament_id", filters.tournamentId);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) {
        // Fallback without joins
        let q2 = supabase.from("matches").select("*").order("match_date", { ascending: false });
        if (filters?.status) q2 = q2.eq("status", filters.status);
        if (filters?.limit) q2 = q2.limit(filters.limit);
        const { data: d2, error: e2 } = await q2;
        if (e2) throw e2;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

export const usePlayerStats = (playerId?: string) =>
  useQuery({
    queryKey: ["player_stats", playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("player_stats").select("*").eq("player_id", playerId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useMyPlayer = (userId?: string) =>
  useQuery({
    queryKey: ["my_player", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*, team_players(team_id, teams(id,name,short_name))").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
