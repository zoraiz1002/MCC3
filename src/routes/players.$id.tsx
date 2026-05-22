import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/players/$id")({ component: PlayerDetail });

function PlayerDetail() {
  const { id } = Route.useParams();
  const { data: player, isLoading, error } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*, team_players(teams(id,name))").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: stats } = useQuery({
    queryKey: ["player_stats", id],
    queryFn: async () => (await supabase.from("player_stats").select("*").eq("player_id", id).maybeSingle()).data,
  });
  const { data: recent } = useQuery({
    queryKey: ["player_matches", id],
    queryFn: async () => (await supabase.from("batting_scorecards").select("*, matches(*)").eq("player_id", id).order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={2} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !player && <EmptyState title="Player not found" />}
        {player && (
          <>
            <div className="flex items-center gap-6">
              <div className="h-28 w-28 overflow-hidden rounded-full bg-muted">
                {player.photo_url && <img src={player.photo_url} alt={player.full_name} className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div>
                <h1 className="font-display text-5xl">{player.full_name}</h1>
                <div className="text-muted-foreground">{player.role} · {player.batting_style} · #{player.jersey_number ?? "—"}</div>
              </div>
            </div>
            {player.bio && <p className="mt-6 max-w-3xl text-muted-foreground">{player.bio}</p>}

            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              {[
                ["Matches", stats?.matches ?? 0],
                ["Runs", stats?.runs ?? 0],
                ["HS", stats?.highest_score ?? 0],
                ["Wickets", stats?.wickets ?? 0],
              ].map(([k, v]) => (
                <Card key={k as string} className="p-4 text-center">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-display text-3xl">{v as any}</div>
                </Card>
              ))}
            </div>

            <h2 className="mt-10 font-display text-3xl">Recent innings</h2>
            <div className="mt-4 space-y-2">
              {(recent ?? []).length === 0 && <EmptyState title="No innings recorded" />}
              {(recent ?? []).map((r: any) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  {r.matches?.match_date && new Date(r.matches.match_date).toLocaleDateString()} · {r.runs}({r.balls}) · {r.dismissal || "not out"}
                </div>
              ))}
            </div>

            <div className="mt-10"><Link to="/players"><Button variant="outline">← Back</Button></Link></div>
          </>
        )}
      </section>
    </PageShell>
  );
}
