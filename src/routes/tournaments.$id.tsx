import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/tournaments/$id")({ component: TournamentDetail });

function TournamentDetail() {
  const { id } = Route.useParams();
  const { data: t, isLoading, error } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => (await supabase.from("tournaments").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: matches } = useQuery({
    queryKey: ["t_matches", id],
    queryFn: async () => (await supabase.from("matches").select("*").eq("tournament_id", id).order("match_date")).data ?? [],
  });
  const { data: points } = useQuery({
    queryKey: ["t_points", id],
    queryFn: async () => (await supabase.from("points_table").select("*, teams(name,short_name)").eq("tournament_id", id).order("points", { ascending: false })).data ?? [],
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={2} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !t && <EmptyState title="Tournament not found" />}
        {t && (
          <>
            <div className="text-xs text-muted-foreground">{t.format?.toUpperCase()} · {t.status?.toUpperCase()}</div>
            <h1 className="font-display text-5xl">{t.name}</h1>
            <div className="mt-2 text-sm text-muted-foreground">
              {t.start_date && new Date(t.start_date).toLocaleDateString()} {t.end_date && `— ${new Date(t.end_date).toLocaleDateString()}`}
              {t.venue && ` · ${t.venue}`}
            </div>
            {t.description && <p className="mt-4 max-w-3xl text-muted-foreground">{t.description}</p>}

            <h2 className="mt-10 font-display text-3xl">Fixtures</h2>
            <div className="mt-4 space-y-2">
              {(matches ?? []).length === 0 && <EmptyState title="No matches scheduled" />}
              {(matches ?? []).map((m: any) => (
                <Link key={m.id} to="/matches/$id" params={{ id: m.id }} className="block rounded-lg border p-3 text-sm hover:border-secondary">
                  {m.match_date && new Date(m.match_date).toLocaleString()} · {m.venue} · <span className="font-semibold">{m.status}</span>
                </Link>
              ))}
            </div>

            <h2 className="mt-10 font-display text-3xl">Points Table</h2>
            {(points ?? []).length === 0 ? <EmptyState title="No standings yet" /> : (
              <Card className="mt-4 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left">
                    <tr><th className="p-2">#</th><th className="p-2">Team</th><th className="p-2">P</th><th className="p-2">W</th><th className="p-2">L</th><th className="p-2">NR</th><th className="p-2">NRR</th><th className="p-2">Pts</th></tr>
                  </thead>
                  <tbody>
                    {(points ?? []).map((p: any, i: number) => (
                      <tr key={p.team_id} className="border-t">
                        <td className="p-2">{i+1}</td>
                        <td className="p-2 font-semibold">{p.teams?.name}</td>
                        <td className="p-2">{p.played}</td><td className="p-2">{p.won}</td>
                        <td className="p-2">{p.lost}</td><td className="p-2">{p.no_result}</td>
                        <td className="p-2">{Number(p.nrr).toFixed(2)}</td>
                        <td className="p-2 font-bold">{p.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            <div className="mt-10"><Link to="/tournaments"><Button variant="outline">← Back</Button></Link></div>
          </>
        )}
      </section>
    </PageShell>
  );
}
