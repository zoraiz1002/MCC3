import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/matches/$id")({
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { id } = Route.useParams();

  const { data: match, isLoading, error } = useQuery({
    queryKey: ["match_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          a:teams!matches_team_a_fkey(id, name, short_name),
          b:teams!matches_team_b_fkey(id, name, short_name),
          winner:teams!matches_winner_id_fkey(id, name),
          motm:players!matches_man_of_match_id_fkey(id, full_name, role)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: innings } = useQuery({
    queryKey: ["match_innings", id],
    enabled: !!match,
    queryFn: async () => {
      const { data } = await supabase
        .from("innings")
        .select("*")
        .eq("match_id", id)
        .order("innings_no");
      return data ?? [];
    },
  });

  const { data: battingCards } = useQuery({
    queryKey: ["match_batting", id],
    enabled: !!match,
    queryFn: async () => {
      const { data } = await supabase
        .from("batting_scorecards")
        .select("*, player:players(id, full_name)")
        .eq("match_id", id);
      return data ?? [];
    },
  });

  const { data: bowlingCards } = useQuery({
    queryKey: ["match_bowling", id],
    enabled: !!match,
    queryFn: async () => {
      const { data } = await supabase
        .from("bowling_scorecards")
        .select("*, player:players(id, full_name)")
        .eq("match_id", id);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl px-4 py-10 text-center text-muted-foreground">
          Loading match…
        </div>
      </PageShell>
    );
  }

  if (error || !match) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl px-4 py-10 text-center text-destructive">
          Match not found.{" "}
          <Link to="/matches" className="underline">
            Back to matches
          </Link>
        </div>
      </PageShell>
    );
  }

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-500",
    live: "bg-green-500 animate-pulse",
    completed: "bg-gray-500",
    abandoned: "bg-red-500",
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">

        {/* Match Header */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusColor[match.status] ?? "bg-gray-400"}`}
            />
            <Badge variant="outline" className="capitalize">
              {match.status}
            </Badge>
            {match.match_type && (
              <Badge variant="outline">{match.match_type}</Badge>
            )}
          </div>

          {/* Teams & Score */}
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <div>
              <div className="font-display text-2xl">{match.a?.name}</div>
              {match.score_a && (
                <div className="text-3xl font-bold mt-1">{match.score_a}</div>
              )}
            </div>
            <div className="font-display text-lg text-muted-foreground">VS</div>
            <div>
              <div className="font-display text-2xl">{match.b?.name}</div>
              {match.score_b && (
                <div className="text-3xl font-bold mt-1">{match.score_b}</div>
              )}
            </div>
          </div>

          {/* Match info */}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground justify-center">
            {match.match_date && (
              <span>📅 {new Date(match.match_date).toLocaleString()}</span>
            )}
            {match.venue && <span>📍 {match.venue}</span>}
            {match.overs && <span>🏏 {match.overs} overs</span>}
          </div>

          {/* Toss */}
          {match.toss_winner_id && (
            <div className="mt-3 text-center text-sm text-muted-foreground">
              {match.toss_winner_id === match.team_a
                ? match.a?.name
                : match.b?.name}{" "}
              won toss and elected to{" "}
              <span className="font-semibold">{match.toss_decision}</span>
            </div>
          )}

          {/* Result */}
          {match.result_description && (
            <div className="mt-3 text-center font-display text-xl text-secondary">
              {match.result_description}
            </div>
          )}

          {/* Man of the Match */}
          {match.motm && (
            <div className="mt-4 flex justify-center">
              <div className="rounded-xl border border-secondary px-6 py-3 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Man of the Match
                </div>
                <div className="font-display text-xl">{match.motm.full_name}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">
                  {match.motm.role}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Scorecards */}
        {(innings ?? []).length > 0 ? (
          <Tabs defaultValue={`innings-${(innings ?? [])[0]?.id}`}>
            <TabsList className={`grid w-full grid-cols-${Math.min((innings ?? []).length, 2)}`}>
              {(innings ?? []).map((inn: any) => {
                const battingTeam =
                  inn.batting_team_id === match.team_a
                    ? match.a?.name
                    : match.b?.name;
                const runs = inn.runs ?? 0;
                const wickets = inn.wickets ?? 0;
                const overs = inn.overs
                  ? Number(inn.overs).toFixed(1)
                  : "0.0";
                return (
                  <TabsTrigger key={inn.id} value={`innings-${inn.id}`}>
                    {inn.innings_no === 1 ? "1st" : "2nd"} Innings ·{" "}
                    {battingTeam}: {runs}/{wickets} ({overs})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(innings ?? []).map((inn: any) => {
              const battingTeamName =
                inn.batting_team_id === match.team_a
                  ? match.a?.name
                  : match.b?.name;
              const bowlingTeamName =
                inn.bowling_team_id === match.team_a
                  ? match.a?.name
                  : match.b?.name;

              const batters = (battingCards ?? []).filter(
                (c: any) => c.team_id === inn.batting_team_id
              );
              const bowlers = (bowlingCards ?? []).filter(
                (c: any) => c.team_id === inn.bowling_team_id
              );

              const totalRuns = inn.runs ?? 0;
              const totalWickets = inn.wickets ?? 0;
              const totalOvers = inn.overs ? Number(inn.overs).toFixed(1) : "0.0";

              return (
                <TabsContent
                  key={inn.id}
                  value={`innings-${inn.id}`}
                  className="space-y-4 mt-4"
                >
                  {/* Batting Scorecard */}
                  <Card className="overflow-hidden">
                    <div className="px-4 py-3 bg-muted font-semibold text-sm">
                      🏏 Batting — {battingTeamName}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="px-4 py-2 font-medium">Batsman</th>
                            <th className="px-4 py-2 font-medium">Dismissal</th>
                            <th className="px-4 py-2 text-right font-medium">R</th>
                            <th className="px-4 py-2 text-right font-medium">B</th>
                            <th className="px-4 py-2 text-right font-medium">4s</th>
                            <th className="px-4 py-2 text-right font-medium">6s</th>
                            <th className="px-4 py-2 text-right font-medium">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batters.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                No batting data
                              </td>
                            </tr>
                          ) : (
                            batters.map((b: any) => {
                              const sr =
                                b.balls > 0
                                  ? ((b.runs / b.balls) * 100).toFixed(1)
                                  : "0.0";
                              return (
                                <tr key={b.id} className="border-b last:border-0">
                                  <td className="px-4 py-2 font-medium">
                                    {b.player?.full_name ?? "—"}
                                  </td>
                                  <td className="px-4 py-2 text-muted-foreground text-xs capitalize">
                                    {b.dismissal ?? "not out"}
                                  </td>
                                  <td className="px-4 py-2 text-right font-bold">{b.runs ?? 0}</td>
                                  <td className="px-4 py-2 text-right">{b.balls ?? 0}</td>
                                  <td className="px-4 py-2 text-right">{b.fours ?? 0}</td>
                                  <td className="px-4 py-2 text-right">{b.sixes ?? 0}</td>
                                  <td className="px-4 py-2 text-right">{sr}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/50 font-semibold">
                            <td className="px-4 py-2" colSpan={2}>TOTAL</td>
                            <td className="px-4 py-2 text-right" colSpan={5}>
                              {totalRuns}/{totalWickets} ({totalOvers} ov)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Card>

                  {/* Bowling Scorecard */}
                  <Card className="overflow-hidden">
                    <div className="px-4 py-3 bg-muted font-semibold text-sm">
                      🎳 Bowling — {bowlingTeamName}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="px-4 py-2 font-medium">Bowler</th>
                            <th className="px-4 py-2 text-right font-medium">O</th>
                            <th className="px-4 py-2 text-right font-medium">M</th>
                            <th className="px-4 py-2 text-right font-medium">R</th>
                            <th className="px-4 py-2 text-right font-medium">W</th>
                            <th className="px-4 py-2 text-right font-medium">Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bowlers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                No bowling data
                              </td>
                            </tr>
                          ) : (
                            bowlers.map((b: any) => {
                              const econ =
                                b.overs > 0
                                  ? (b.runs / b.overs).toFixed(2)
                                  : "0.00";
                              return (
                                <tr key={b.id} className="border-b last:border-0">
                                  <td className="px-4 py-2 font-medium">
                                    {b.player?.full_name ?? "—"}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {Number(b.overs ?? 0).toFixed(1)}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {b.maidens ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">{b.runs ?? 0}</td>
                                  <td className="px-4 py-2 text-right font-bold">
                                    {b.wickets ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">{econ}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            {match.status === "scheduled"
              ? "Match has not started yet."
              : "No scorecard data available."}
          </Card>
        )}

        <div className="text-center">
          <Link to="/matches" className="text-sm text-muted-foreground underline">
            ← Back to Matches
          </Link>
        </div>
      </section>
    </PageShell>
  );
}