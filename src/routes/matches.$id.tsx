import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/matches/$id")({ component: MatchDetail });

function fmtSR(runs: number, balls: number) {
  if (!balls) return "—";
  return ((runs / balls) * 100).toFixed(1);
}

function MatchDetail() {
  const { id } = Route.useParams();

  const { data: m, isLoading, error } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          a:teams!matches_team_a_fkey(id,name,short_name),
          b:teams!matches_team_b_fkey(id,name,short_name),
          tournament:tournaments(id,name),
          toss_winner:teams!matches_toss_winner_id_fkey(id,name),
          winner:teams!matches_winner_id_fkey(id,name),
          motm:players!matches_man_of_match_id_fkey(id,full_name,role)
        `)
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: innings } = useQuery({
    queryKey: ["match_innings", id],
    enabled: !!m,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("innings")
        .select("*, batting_team:teams!innings_batting_team_id_fkey(id,name,short_name), bowling_team:teams!innings_bowling_team_id_fkey(id,name,short_name)")
        .eq("match_id", id)
        .order("innings_no");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: batting } = useQuery({
    queryKey: ["match_batting", id],
    enabled: !!m,
    queryFn: async () => (await supabase.from("batting_scorecards").select("*, players(id,full_name)").eq("match_id", id)).data ?? [],
  });
  const { data: bowling } = useQuery({
    queryKey: ["match_bowling", id],
    enabled: !!m,
    queryFn: async () => (await supabase.from("bowling_scorecards").select("*, players(id,full_name)").eq("match_id", id)).data ?? [],
  });
  const { data: wickets } = useQuery({
    queryKey: ["match_wickets", id],
    enabled: !!(innings && innings.length),
    queryFn: async () => {
      const ids = (innings ?? []).map((i: any) => i.id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("balls")
        .select("innings_id, over_no, ball_no, out_player_id, players:out_player_id(id,full_name)")
        .in("innings_id", ids)
        .eq("is_wicket", true)
        .order("over_no");
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
        {error && <ErrorState error={error} />}
        {!isLoading && !m && <EmptyState title="Match not found" />}
        {m && (
          <>
            {/* Header */}
            <div className="text-xs text-muted-foreground">
              {m.tournament?.name} · {m.match_type} · {m.overs} overs
            </div>
            <h1 className="font-display text-4xl">{m.a?.name} vs {m.b?.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {m.match_date && new Date(m.match_date).toLocaleString()}{m.venue ? ` · ${m.venue}` : ""}
            </div>
            <div className="mt-4 inline-block rounded-md bg-muted px-3 py-1 text-xs font-bold">
              {(m.status ?? "").toUpperCase()}
            </div>

            {(m.toss_winner || m.winner || m.motm) && (
              <Card className="mt-4 p-4 space-y-2">
                {m.toss_winner && m.toss_decision && (
                  <div className="text-sm">
                    🪙 <span className="font-semibold">{m.toss_winner.name}</span> won the toss and elected to <span className="font-semibold">{m.toss_decision}</span>
                  </div>
                )}
                {m.winner && (
                  <div className="text-sm">
                    🏆 <span className="font-semibold">{m.winner.name}</span> won{m.result_description ? ` — ${m.result_description}` : ""}
                  </div>
                )}
                {!m.winner && m.result_description && (
                  <div className="text-sm">{m.result_description}</div>
                )}
                {m.motm && (
                  <div className="mt-2 inline-block rounded-md bg-secondary/15 px-3 py-2 text-sm">
                    ⭐ <span className="font-semibold">Man of the Match:</span> {m.motm.full_name}
                    {m.motm.role ? ` (${m.motm.role})` : ""}
                  </div>
                )}
              </Card>
            )}

            {/* Innings tabs */}
            <h2 className="mt-8 font-display text-2xl">Scorecard</h2>
            {(innings ?? []).length === 0 ? (
              <EmptyState title="No scorecard data yet" />
            ) : (
              <Tabs defaultValue={String(innings![0].innings_no)} className="mt-3">
                <TabsList className="flex flex-wrap h-auto">
                  {innings!.map((inn: any) => (
                    <TabsTrigger key={inn.id} value={String(inn.innings_no)}>
                      {ordinal(inn.innings_no)} Innings — {inn.batting_team?.short_name || inn.batting_team?.name}: {inn.runs}/{inn.wickets} ({fmtOvers(inn.overs, inn.balls)})
                    </TabsTrigger>
                  ))}
                </TabsList>
                {innings!.map((inn: any) => {
                  const innBatting = (batting ?? []).filter((b: any) => b.team_id === inn.batting_team_id);
                  const innBowling = (bowling ?? []).filter((b: any) => b.team_id === inn.bowling_team_id);
                  const innWickets = (wickets ?? []).filter((w: any) => w.innings_id === inn.id);
                  return (
                    <TabsContent key={inn.id} value={String(inn.innings_no)} className="space-y-6">
                      {/* Batting */}
                      <div>
                        <h3 className="font-display text-xl">Batting — {inn.batting_team?.name}</h3>
                        {innBatting.length === 0 ? (
                          <EmptyState title="No batting data" />
                        ) : (
                          <Card className="mt-2 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted text-left">
                                <tr>
                                  <th className="p-2">Batsman</th>
                                  <th className="p-2">Dismissal</th>
                                  <th className="p-2 text-right">R</th>
                                  <th className="p-2 text-right">B</th>
                                  <th className="p-2 text-right">4s</th>
                                  <th className="p-2 text-right">6s</th>
                                  <th className="p-2 text-right">SR</th>
                                </tr>
                              </thead>
                              <tbody>
                                {innBatting.map((b: any) => (
                                  <tr key={b.id} className="border-t">
                                    <td className="p-2 font-medium">{b.players?.full_name}</td>
                                    <td className="p-2 text-muted-foreground">{b.dismissal || "not out"}</td>
                                    <td className="p-2 text-right">{b.runs}</td>
                                    <td className="p-2 text-right">{b.balls}</td>
                                    <td className="p-2 text-right">{b.fours}</td>
                                    <td className="p-2 text-right">{b.sixes}</td>
                                    <td className="p-2 text-right">{fmtSR(b.runs, b.balls)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t bg-muted/50 font-semibold">
                                  <td className="p-2" colSpan={6}>TOTAL</td>
                                  <td className="p-2 text-right">{inn.runs}/{inn.wickets} ({fmtOvers(inn.overs, inn.balls)})</td>
                                </tr>
                              </tbody>
                            </table>
                          </Card>
                        )}
                      </div>

                      {/* Bowling */}
                      <div>
                        <h3 className="font-display text-xl">Bowling — {inn.bowling_team?.name}</h3>
                        {innBowling.length === 0 ? (
                          <EmptyState title="No bowling data" />
                        ) : (
                          <Card className="mt-2 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted text-left">
                                <tr>
                                  <th className="p-2">Bowler</th>
                                  <th className="p-2 text-right">O</th>
                                  <th className="p-2 text-right">M</th>
                                  <th className="p-2 text-right">R</th>
                                  <th className="p-2 text-right">W</th>
                                  <th className="p-2 text-right">Econ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {innBowling.map((b: any) => {
                                  const econ = Number(b.overs) > 0 ? (Number(b.runs) / Number(b.overs)).toFixed(2) : (Number(b.economy) || 0).toFixed(2);
                                  return (
                                    <tr key={b.id} className="border-t">
                                      <td className="p-2 font-medium">{b.players?.full_name}</td>
                                      <td className="p-2 text-right">{b.overs}</td>
                                      <td className="p-2 text-right">{b.maidens}</td>
                                      <td className="p-2 text-right">{b.runs}</td>
                                      <td className="p-2 text-right">{b.wickets}</td>
                                      <td className="p-2 text-right">{econ}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </Card>
                        )}
                      </div>

                      {/* Fall of wickets */}
                      {innWickets.length > 0 && (
                        <div>
                          <h3 className="font-display text-xl">Fall of Wickets</h3>
                          <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            {innWickets.map((w: any, idx: number) => (
                              <div key={`${w.innings_id}-${idx}`}>
                                {idx + 1}-? ({w.players?.full_name || "—"}, {w.over_no}.{w.ball_no} ov)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}

            <div className="mt-10"><Link to="/matches"><Button variant="outline">← Back</Button></Link></div>
          </>
        )}
      </section>
    </PageShell>
  );
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
function fmtOvers(overs: any, balls: any) {
  if (overs != null && overs !== 0) return String(overs);
  if (balls != null) {
    const o = Math.floor(Number(balls) / 6);
    const b = Number(balls) % 6;
    return `${o}.${b}`;
  }
  return "0.0";
}
