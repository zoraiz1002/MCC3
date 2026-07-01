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

function oversForDisplayFromBalls(balls?: number | null) {
  const b = Number(balls ?? 0);
  return `${Math.floor(b / 6)}.${b % 6}`;
}

function statusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusColor(status?: string | null) {
  if (status === "live") return "bg-green-500 animate-pulse";
  if (status === "upcoming") return "bg-blue-500";
  if (status === "completed") return "bg-gray-500";
  return "bg-gray-400";
}

function MatchDetailPage() {
  const { id } = Route.useParams();

  const {
    data: match,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["match_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          a:teams!matches_team_a_fkey(id, name, short_name),
          b:teams!matches_team_b_fkey(id, name, short_name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  const { data: innings } = useQuery({
    queryKey: ["match_innings", id],
    enabled: !!match,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("innings")
        .select("*")
        .eq("match_id", id)
        .order("innings_no");

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: battingCards } = useQuery({
    queryKey: ["match_batting", id],
    enabled: !!match,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batting_scorecards")
        .select("*, player:players(id, full_name)")
        .eq("match_id", id);

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bowlingCards } = useQuery({
    queryKey: ["match_bowling", id],
    enabled: !!match,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_scorecards")
        .select("*, player:players(id, full_name)")
        .eq("match_id", id);

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: balls } = useQuery({
    queryKey: ["match_balls", id],
    enabled: !!match && !!innings,
    queryFn: async () => {
      const inningsIds = (innings ?? []).map((i: any) => i.id);

      if (inningsIds.length === 0) return [];

      const { data, error } = await supabase
        .from("balls")
        .select("*")
        .in("innings_id", inningsIds)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: players } = useQuery({
    queryKey: ["match_players_simple"],
    enabled: !!match,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, role")
        .order("full_name");

      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-muted-foreground">
          Loading match…
        </div>
      </PageShell>
    );
  }

  if (error || !match) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-destructive">
          Match not found.{" "}
          <Link to="/matches" className="underline">
            Back to matches
          </Link>
        </div>
      </PageShell>
    );
  }

  const teamAName = match.a?.name || "Team A";
  const teamBName = match.b?.name || "Team B";

  const winnerId = match.winner_id;
  const winnerName =
    winnerId === match.team_a
      ? teamAName
      : winnerId === match.team_b
        ? teamBName
        : null;

  const tossWinnerId = match.toss_winner_id || match.toss_winner;
  const tossWinnerName =
    tossWinnerId === match.team_a
      ? teamAName
      : tossWinnerId === match.team_b
        ? teamBName
        : null;

  const motmId = match.man_of_match_id || match.motm_player_id;
  const motm = (players ?? []).find((p: any) => p.id === motmId);

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusColor(
                match.status
              )}`}
            />
            <Badge variant="outline">{statusLabel(match.status)}</Badge>
            {match.match_type && <Badge variant="outline">{match.match_type}</Badge>}
            {match.overs && <Badge variant="outline">{match.overs} overs</Badge>}
          </div>

          <div className="grid grid-cols-3 items-center gap-3 text-center">
            <div>
              <div className="font-display text-2xl">{teamAName}</div>
              <div className="mt-2 text-3xl font-bold">
                {match.score_a || "—"}
              </div>
            </div>

            <div className="font-display text-lg text-muted-foreground">VS</div>

            <div>
              <div className="font-display text-2xl">{teamBName}</div>
              <div className="mt-2 text-3xl font-bold">
                {match.score_b || "—"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            {match.match_date && (
              <span>📅 {new Date(match.match_date).toLocaleString()}</span>
            )}
            {!match.match_date && match.scheduled_at && (
              <span>📅 {new Date(match.scheduled_at).toLocaleString()}</span>
            )}
            {match.venue && <span>📍 {match.venue}</span>}
          </div>

          {tossWinnerName && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Toss: <strong>{tossWinnerName}</strong>
              {match.toss_decision && (
                <>
                  {" "}
                  chose <strong>{match.toss_decision}</strong>
                </>
              )}
            </div>
          )}

          {winnerName && (
            <div className="mt-4 text-center text-sm">
              Winner: <strong>{winnerName}</strong>
            </div>
          )}

          {match.result_description && (
            <div className="mt-4 text-center font-display text-xl text-secondary">
              {match.result_description}
            </div>
          )}

          {motm && (
            <div className="mt-5 flex justify-center">
              <div className="rounded-xl border border-secondary px-6 py-3 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Man of the Match
                </div>
                <div className="font-display text-xl">{motm.full_name}</div>
                {motm.role && (
                  <div className="text-xs text-muted-foreground capitalize mt-0.5">
                    {motm.role}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {(innings ?? []).length > 0 ? (
          <Tabs defaultValue={`innings-${(innings ?? [])[0]?.id}`}>
            <TabsList className="grid w-full grid-cols-2">
              {(innings ?? []).map((inn: any) => {
                const battingTeam =
                  inn.batting_team_id === match.team_a ? teamAName : teamBName;

                const totalOvers =
                  inn.balls !== null && inn.balls !== undefined
                    ? oversForDisplayFromBalls(inn.balls)
                    : Number(inn.overs ?? 0).toFixed(1);

                return (
                  <TabsTrigger key={inn.id} value={`innings-${inn.id}`}>
                    {inn.innings_no === 1 ? "1st" : "2nd"} Innings ·{" "}
                    {battingTeam}: {inn.runs ?? 0}/{inn.wickets ?? 0} (
                    {totalOvers})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(innings ?? []).map((inn: any) => {
              const battingTeamName =
                inn.batting_team_id === match.team_a ? teamAName : teamBName;

              const bowlingTeamName =
                inn.bowling_team_id === match.team_a ? teamAName : teamBName;

              const batters = (battingCards ?? []).filter(
                (c: any) => c.team_id === inn.batting_team_id
              );

              const bowlers = (bowlingCards ?? []).filter(
                (c: any) => c.team_id === inn.bowling_team_id
              );

              const inningsBalls = (balls ?? []).filter(
                (b: any) => b.innings_id === inn.id
              );

              const totalOvers =
                inn.balls !== null && inn.balls !== undefined
                  ? oversForDisplayFromBalls(inn.balls)
                  : Number(inn.overs ?? 0).toFixed(1);

              return (
                <TabsContent
                  key={inn.id}
                  value={`innings-${inn.id}`}
                  className="space-y-4 mt-4"
                >
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-display text-2xl">
                          {battingTeamName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Innings {inn.innings_no}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-display text-4xl">
                          {inn.runs ?? 0}/{inn.wickets ?? 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {totalOvers} overs
                        </div>
                      </div>
                    </div>
                  </Card>

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
                              <td
                                colSpan={7}
                                className="px-4 py-6 text-center text-muted-foreground"
                              >
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
                                  <td className="px-4 py-2 text-right font-bold">
                                    {b.runs ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {b.balls ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {b.fours ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {b.sixes ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">{sr}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>

                        <tfoot>
                          <tr className="border-t bg-muted/50 font-semibold">
                            <td className="px-4 py-2" colSpan={2}>
                              TOTAL
                            </td>
                            <td className="px-4 py-2 text-right" colSpan={5}>
                              {inn.runs ?? 0}/{inn.wickets ?? 0} ({totalOvers} ov)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Card>

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
                              <td
                                colSpan={6}
                                className="px-4 py-6 text-center text-muted-foreground"
                              >
                                No bowling data
                              </td>
                            </tr>
                          ) : (
                            bowlers.map((b: any) => {
                              const econ =
                                Number(b.overs ?? 0) > 0
                                  ? (Number(b.runs ?? 0) / Number(b.overs ?? 1)).toFixed(2)
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
                                  <td className="px-4 py-2 text-right">
                                    {b.runs ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right font-bold">
                                    {b.wickets ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {econ}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card className="overflow-hidden">
                    <div className="px-4 py-3 bg-muted font-semibold text-sm">
                      Ball by ball
                    </div>

                    <div className="p-4">
                      {inningsBalls.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No balls recorded yet.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {inningsBalls.map((ball: any) => {
                            const label =
                              ball.is_wicket
                                ? "W"
                                : ball.extras_type && ball.extras_type !== "none"
                                  ? `${ball.extras_runs ?? 0} ${
                                      ball.extras_type
                                    }`
                                  : `${ball.runs ?? 0}`;

                            return (
                              <div
                                key={ball.id}
                                className="rounded-full border px-3 py-1 text-xs"
                                title={`Over ${ball.over_no}.${ball.ball_no}`}
                              >
                                {ball.over_no}.{ball.ball_no}: {label}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            {match.status === "upcoming"
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