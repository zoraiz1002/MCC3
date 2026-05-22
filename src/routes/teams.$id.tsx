import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/teams/$id")({ component: TeamDetail });

function TeamDetail() {
  const { id } = Route.useParams();
  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, team_players(player_id, players(id,full_name,role,photo_url,jersey_number))")
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

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={3} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !team && <EmptyState title="Team not found" />}
        {team && (
          <>
            <div className="flex items-center gap-6">
              {team.badge_url && <img src={team.badge_url} className="h-24 w-24 rounded-full object-cover" alt={team.name} loading="lazy" />}
              <div>
                <div className="text-xs text-muted-foreground">{team.category}</div>
                <h1 className="font-display text-5xl">{team.name}</h1>
                {team.home_ground && <div className="mt-1 text-sm text-muted-foreground">🏟 {team.home_ground}</div>}
              </div>
            </div>
            {team.description && <p className="mt-6 max-w-3xl text-muted-foreground">{team.description}</p>}

            <h2 className="mt-10 font-display text-3xl">Squad</h2>
            {(team.team_players ?? []).length === 0 ? (
              <EmptyState title="No squad members yet" />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {team.team_players.map((tp: any) => tp.players && (
                  <Card key={tp.player_id} className="p-4 text-center">
                    <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-muted">
                      {tp.players.photo_url ? <img src={tp.players.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                    <div className="mt-2 font-semibold">{tp.players.full_name}</div>
                    <div className="text-xs text-muted-foreground">{tp.players.role}</div>
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
          </>
        )}
      </section>
    </PageShell>
  );
}
