import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/teams/$id")({
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { id } = Route.useParams();
  const { isAdmin, isCaptain } = useAuth();
  const qc = useQueryClient();
  const [squadOpen, setSquadOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          captain:players!teams_captain_id_fkey(id, full_name, role),
          vice:players!teams_vice_captain_id_fkey(id, full_name, role),
          team_players(
            players(id, full_name, role, batting_style, bowling_style, jersey_number, photo_url)
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: allPlayers } = useQuery({
    queryKey: ["all_players_for_team", id],
    enabled: squadOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
  });

  const squadIds = new Set(
    (team?.team_players ?? []).map((tp: any) => tp.players?.id).filter(Boolean)
  );

  const addPlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("team_players")
        .insert({ team_id: id, player_id: playerId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Player added to team");
      qc.invalidateQueries({ queryKey: ["team_detail", id] });
      qc.invalidateQueries({ queryKey: ["all_players_for_team", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("team_players")
        .delete()
        .eq("team_id", id)
        .eq("player_id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Player removed from team");
      qc.invalidateQueries({ queryKey: ["team_detail", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-muted-foreground">
          Loading team…
        </div>
      </PageShell>
    );
  }

  if (error || !team) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-destructive">
          Team not found.{" "}
          <Link to="/teams" className="underline">
            Back to teams
          </Link>
        </div>
      </PageShell>
    );
  }

  const squad = (team.team_players ?? [])
    .map((tp: any) => tp.players)
    .filter(Boolean);

  const filteredAvailable = (allPlayers ?? []).filter(
    (p: any) =>
      !squadIds.has(p.id) &&
      p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-secondary text-secondary-foreground font-display text-2xl font-bold">
              {team.short_name ?? team.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-4xl">{team.name}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{team.category}</Badge>
                {team.home_ground && (
                  <Badge variant="outline">📍 {team.home_ground}</Badge>
                )}
              </div>
            </div>
          </div>
          {(isAdmin || isCaptain) && (
            <Button
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => setSquadOpen(true)}
            >
              Manage Squad
            </Button>
          )}
        </div>

        {/* Captain & Vice Captain */}
        {(team.captain || team.vice) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {team.captain && (
              <Card className="p-4 border-secondary">
                <div className="text-xs font-bold text-secondary mb-1">CAPTAIN</div>
                <div className="font-semibold">{team.captain.full_name}</div>
                <div className="text-xs text-muted-foreground">{team.captain.role}</div>
              </Card>
            )}
            {team.vice && (
              <Card className="p-4">
                <div className="text-xs font-bold text-muted-foreground mb-1">VICE CAPTAIN</div>
                <div className="font-semibold">{team.vice.full_name}</div>
                <div className="text-xs text-muted-foreground">{team.vice.role}</div>
              </Card>
            )}
          </div>
        )}

        {/* Squad */}
        <div>
          <h2 className="font-display text-2xl mb-4">
            Squad ({squad.length} players)
          </h2>
          {squad.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No players yet.{" "}
              {(isAdmin || isCaptain) && (
                <button
                  className="underline"
                  onClick={() => setSquadOpen(true)}
                >
                  Add players
                </button>
              )}
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {squad.map((p: any) => (
                <Card key={p.id} className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center font-bold text-lg">
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      p.full_name?.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {p.jersey_number ? `#${p.jersey_number} ` : ""}
                      {p.full_name}
                      {p.id === team.captain?.id && (
                        <span className="ml-1 text-xs text-secondary font-bold">(C)</span>
                      )}
                      {p.id === team.vice?.id && (
                        <span className="ml-1 text-xs text-muted-foreground font-bold">(VC)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {p.role}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.batting_style} {p.bowling_style ? `· ${p.bowling_style}` : ""}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Manage Squad Dialog */}
        <Dialog open={squadOpen} onOpenChange={setSquadOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Squad — {team.name}</DialogTitle>
            </DialogHeader>

            {/* Current squad */}
            <div className="mt-2">
              <h3 className="font-semibold text-sm mb-2">
                Current Squad ({squad.length})
              </h3>
              {squad.length === 0 ? (
                <p className="text-sm text-muted-foreground">No players yet.</p>
              ) : (
                <div className="space-y-2">
                  {squad.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{p.full_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          {p.role}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removePlayer.mutate(p.id)}
                        disabled={removePlayer.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add players */}
            <div className="mt-4">
              <h3 className="font-semibold text-sm mb-2">Add Players</h3>
              <Input
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-3"
              />
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No available players found.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredAvailable.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{p.full_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          {p.role}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-500"
                        onClick={() => addPlayer.mutate(p.id)}
                        disabled={addPlayer.isPending}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </PageShell>
  );
}