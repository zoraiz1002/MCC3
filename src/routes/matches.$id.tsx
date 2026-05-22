import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/matches/$id")({ component: MatchDetail });

function MatchDetail() {
  const { id } = Route.useParams();
  const { data: m, isLoading, error } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await supabase.from("matches").select("*, a:teams!matches_team_a_fkey(id,name), b:teams!matches_team_b_fkey(id,name), tournament:tournaments(id,name)").eq("id", id).maybeSingle()).data,
  });
  const { data: batting } = useQuery({
    queryKey: ["match_batting", id],
    queryFn: async () => (await supabase.from("batting_scorecards").select("*, players(full_name), teams(name)").eq("match_id", id)).data ?? [],
  });
  const { data: bowling } = useQuery({
    queryKey: ["match_bowling", id],
    queryFn: async () => (await supabase.from("bowling_scorecards").select("*, players(full_name), teams(name)").eq("match_id", id)).data ?? [],
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={2} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !m && <EmptyState title="Match not found" />}
        {m && (
          <>
            <div className="text-xs text-muted-foreground">{m.tournament?.name} · {m.match_type} · {m.overs} overs</div>
            <h1 className="font-display text-4xl">{m.a?.name} vs {m.b?.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {m.match_date && new Date(m.match_date).toLocaleString()} · {m.venue}
            </div>
            <div className="mt-4 inline-block rounded-md bg-muted px-3 py-1 text-xs font-bold">{m.status?.toUpperCase()}</div>
            {(m.score_a || m.score_b) && (
              <Card className="mt-4 p-4">
                <div className="font-display text-2xl">{m.a?.name}: {m.score_a || "—"}</div>
                <div className="font-display text-2xl">{m.b?.name}: {m.score_b || "—"}</div>
                {m.result_description && <div className="mt-2 text-sm text-muted-foreground">{m.result_description}</div>}
              </Card>
            )}

            <h2 className="mt-8 font-display text-2xl">Batting</h2>
            {(batting ?? []).length === 0 ? <EmptyState title="No batting data" /> : (
              <Card className="mt-3 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left"><tr><th className="p-2">Batter</th><th className="p-2">Team</th><th className="p-2">R</th><th className="p-2">B</th><th className="p-2">4s</th><th className="p-2">6s</th><th className="p-2">Out</th></tr></thead>
                  <tbody>
                    {(batting ?? []).map((b: any) => (
                      <tr key={b.id} className="border-t"><td className="p-2 font-medium">{b.players?.full_name}</td><td className="p-2">{b.teams?.name}</td><td className="p-2">{b.runs}</td><td className="p-2">{b.balls}</td><td className="p-2">{b.fours}</td><td className="p-2">{b.sixes}</td><td className="p-2">{b.dismissal || "not out"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            <h2 className="mt-8 font-display text-2xl">Bowling</h2>
            {(bowling ?? []).length === 0 ? <EmptyState title="No bowling data" /> : (
              <Card className="mt-3 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left"><tr><th className="p-2">Bowler</th><th className="p-2">Team</th><th className="p-2">O</th><th className="p-2">M</th><th className="p-2">R</th><th className="p-2">W</th><th className="p-2">Econ</th></tr></thead>
                  <tbody>
                    {(bowling ?? []).map((b: any) => (
                      <tr key={b.id} className="border-t"><td className="p-2 font-medium">{b.players?.full_name}</td><td className="p-2">{b.teams?.name}</td><td className="p-2">{b.overs}</td><td className="p-2">{b.maidens}</td><td className="p-2">{b.runs}</td><td className="p-2">{b.wickets}</td><td className="p-2">{Number(b.economy).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            <div className="mt-10"><Link to="/matches"><Button variant="outline">← Back</Button></Link></div>
          </>
        )}
      </section>
    </PageShell>
  );
}
