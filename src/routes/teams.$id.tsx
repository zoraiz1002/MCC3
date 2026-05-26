import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";
import { useAuth } from "@/lib/auth";
import { ManageSquadDialog } from "@/components/teams/ManageSquadDialog";

export const Route = createFileRoute("/teams/$id")({ component: TeamDetail });

function TeamDetail() {
  const { id } = Route.useParams();
  const { isAdmin, isCaptain } = useAuth();
  const canManage = isAdmin || isCaptain;
  const [manageOpen, setManageOpen] = useState(false);

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          captain:players!teams_captain_id_fkey(id,full_name,role,photo_url),
          vice:players!teams_vice_captain_id_fkey(id,full_name,role,photo_url),
          team_players(player_id, players(id,full_name,role,batting_style,bowling_style,jersey_number,photo_url))
        `)
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: recent } = useQuery({
    queryKey: ["team_matches", id],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("*").or(`team_a.eq.${id},team_b.eq.${id}`).order("match_date", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const squad = (team?.team_players ?? []).map((tp: any) => tp.players).filter(Boolean);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={3} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !team && <EmptyState title="Team not found" />}
        {team && (
          <>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-6">
                {team.badge_url ? (
                  <img src={team.badge_url} className="h-24 w-24 rounded-full object-cover" alt={team.name} loading="lazy" />
                ) : (
                  <div className="hero-gradient flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl text-secondary">
                    {(team.short_name || team.name).slice(0,2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground">{team.category}</div>
                  <h1 className="font-display text-5xl">{team.name}</h1>
                  {team.home_ground && <div className="mt-1 text-sm text-muted-foreground">🏟 {team.home_ground}</div>}
                </div>
              </div>
              {canManage && (
                <Button
                  onClick={() => setManageOpen(true)}
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                >
                  Manage Squad
                </Button>
              )}
            </div>
            {team.description && <p className="mt-6 max-w-3xl text-muted-foreground">{team.description}</p>}

            {(team.captain || team.vice) && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {team.captain && (
                  <Card className="p-5 border-secondary/40">
                    <div className="text-xs font-semibold uppercase tracking-wide text-secondary">Captain</div>
                    <div className="mt-1 font-display text-2xl">{team.captain.full_name}</div>
                    {team.captain.role && <div className="text-sm text-muted-foreground">{team.captain.role}</div>}
                  </Card>
                )}
                {team.vice && (
                  <Card className="p-5 border-secondary/40">
                    <div className="text-xs font-semibold uppercase tracking-wide text-secondary">Vice-Captain</div>
                    <div className="mt-1 font-display text-2xl">{team.vice.full_name}</div>
                    {team.vice.role && <div className="text-sm text-muted-foreground">{team.vice.role}</div>}
                  </Card>
                )}
              </div>
            )}

            <h2 className="mt-10 font-display text-3xl">Squad</h2>
            {squad.length === 0 ? (
              <EmptyState title="No players yet" hint={canManage ? "Use Manage Squad to add players." : undefined} />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {squad.map((p: any) => (
                  <Card key={p.id} className="p-4 flex gap-4 items-center">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                          {p.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">{p.full_name}</div>
                        {p.jersey_number != null && (
                          <span className="text-xs font-mono rounded bg-muted px-1.5 py-0.5">#{p.jersey_number}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.role || "—"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {p.batting_style || "—"}{p.bowling_style ? ` · ${p.bowling_style}` : ""}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <h2 className="mt-10 font-display text-3xl">Recent matches</h2>
            <div className="mt-4 space-y-2">
              {(recent ?? []).length === 0 && <EmptyState title="No matches yet" />}
              {(recent ?? []).map((m: any) => (
                <Link key={m.id} to="/matches/$id" params={{ id: m.id }} className="block rounded-lg border p-3 text-sm hover:border-secondary">
                  {new Date(m.match_date).toLocaleDateString()} · {m.venue} · <span className="font-semibold">{m.status}</span>
                </Link>
              ))}
            </div>

            <div className="mt-10">
              <Link to="/teams"><Button variant="outline">← Back to teams</Button></Link>
            </div>

            {canManage && (
              <ManageSquadDialog
                open={manageOpen}
                onOpenChange={setManageOpen}
                teamId={team.id}
                teamName={team.name}
              />
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}
