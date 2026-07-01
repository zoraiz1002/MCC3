import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import toast from "react-hot-toast";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/scoring")({
  validateSearch: z.object({ matchId: z.string().optional() }).parse,
  component: ScoringPage,
});

type Match = any;
type Player = { id: string; full_name: string };

type Innings = {
  id: string;
  match_id: string;
  innings_no: number;
  batting_team_id: string;
  bowling_team_id: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  is_closed: boolean;
};

type Ball = {
  id: string;
  innings_id: string;
  over_no: number;
  ball_no: number;
  batsman_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  runs: number;
  extras_type: string | null;
  extras_runs: number;
  is_wicket: boolean;
  dismissal_type: string | null;
  out_player_id: string | null;
  new_batsman_id: string | null;
};

function ScoringPage() {
  const { matchId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading, isAdmin, isCaptain } = useAuth();

  useEffect(() => {
    if (!loading && (!user || (!isAdmin && !isCaptain))) {
      navigate({ to: "/matches" });
    }
  }, [loading, user, isAdmin, isCaptain, navigate]);

  if (!matchId) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl p-10 text-center">
          No match selected.{" "}
          <a href="/matches" className="underline">
            Back to matches
          </a>
          .
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ScoringInner matchId={matchId} />
    </PageShell>
  );
}

function ScoringInner({ matchId }: { matchId: string }) {
  const qc = useQueryClient();

  const { data: match, isLoading } = useQuery({
    queryKey: ["scoring_match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "*, a:teams!matches_team_a_fkey(id,name,short_name), b:teams!matches_team_b_fkey(id,name,short_name)"
        )
        .eq("id", matchId)
        .single();

      if (error) throw error;
      return data as Match;
    },
  });

  const { data: innings } = useQuery({
    queryKey: ["scoring_innings", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("innings")
        .select("*")
        .eq("match_id", matchId)
        .order("innings_no");

      if (error) throw error;
      return (data ?? []) as Innings[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["scoring_match", matchId] });
    qc.invalidateQueries({ queryKey: ["scoring_innings", matchId] });
  };

  if (isLoading || !match) {
    return <div className="mx-auto max-w-3xl p-10">Loading…</div>;
  }

  if (match.status === "completed") {
    return <CompletedScreen match={match} innings={innings ?? []} />;
  }

  const currentInnings = (innings ?? []).find((i) => !i.is_closed);

  if (!currentInnings) {
    if ((innings ?? []).length === 0) {
      return <SetupScreen match={match} inningsNo={1} onDone={refresh} />;
    }

    if ((innings ?? []).length === 1) {
      return (
        <InningsBreak
          match={match}
          firstInnings={innings![0]}
          onStart={refresh}
        />
      );
    }

    return (
      <CompleteForm match={match} innings={innings ?? []} onComplete={refresh} />
    );
  }

  return (
    <ScoringBoard match={match} innings={currentInnings} onChange={refresh} />
  );
}

function SetupScreen({
  match,
  inningsNo,
  onDone,
  forcedBattingTeam,
}: {
  match: Match;
  inningsNo: number;
  onDone: () => void;
  forcedBattingTeam?: string;
}) {
  const [tossWinner, setTossWinner] = useState<string>(
    match.toss_winner_id ?? match.toss_winner ?? ""
  );

  const [tossDecision, setTossDecision] = useState<string>(
    match.toss_decision ?? ""
  );

  const battingTeam =
    forcedBattingTeam ??
    (tossWinner && tossDecision
      ? tossDecision === "bat"
        ? tossWinner
        : tossWinner === match.team_a
          ? match.team_b
          : match.team_a
      : "");

  const bowlingTeam = battingTeam
    ? battingTeam === match.team_a
      ? match.team_b
      : match.team_a
    : "";

  const { data: batters } = useTeamPlayers(battingTeam);
  const { data: bowlers } = useTeamPlayers(bowlingTeam);

  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");
  const [busy, setBusy] = useState(false);

  const canStart =
    battingTeam &&
    bowlingTeam &&
    striker &&
    nonStriker &&
    striker !== nonStriker &&
    bowler &&
    (inningsNo === 1 ? tossWinner && tossDecision : true);

  const start = async () => {
    setBusy(true);

    try {
      if (inningsNo === 1) {
        const { error: me } = await supabase
          .from("matches")
          .update({
            toss_winner_id: tossWinner,
            toss_winner: tossWinner,
            toss_decision: tossDecision,
            status: "live",
          })
          .eq("id", match.id);

        if (me) throw me;
      }

      const { data: inn, error } = await supabase
        .from("innings")
        .insert({
          match_id: match.id,
          innings_no: inningsNo,
          batting_team_id: battingTeam,
          bowling_team_id: bowlingTeam,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("batting_scorecards").insert([
        {
          match_id: match.id,
          player_id: striker,
          team_id: battingTeam,
          runs: 0,
          balls: 0,
        },
        {
          match_id: match.id,
          player_id: nonStriker,
          team_id: battingTeam,
          runs: 0,
          balls: 0,
        },
      ]);

      await supabase.from("bowling_scorecards").insert({
        match_id: match.id,
        player_id: bowler,
        team_id: bowlingTeam,
        overs: 0,
        runs: 0,
        wickets: 0,
      });

      localStorage.setItem(
        `mcc.inn.${inn.id}`,
        JSON.stringify({ striker, nonStriker, bowler })
      );

      toast.success(inningsNo === 1 ? "Innings 1 started" : "Innings 2 started");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start innings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6">
        <h1 className="font-display text-3xl">
          Match Setup · Innings {inningsNo}
        </h1>

        <div className="mt-2 text-sm text-muted-foreground">
          {match.a?.name} vs {match.b?.name} ·{" "}
          {match.match_date && new Date(match.match_date).toLocaleString()} ·{" "}
          {match.venue || "TBD"}
        </div>

        {inningsNo === 1 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <Label>Toss Winner</Label>
              <Select value={tossWinner} onValueChange={setTossWinner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.team_a}>{match.a?.name}</SelectItem>
                  <SelectItem value={match.team_b}>{match.b?.name}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Decision</Label>
              <Select value={tossDecision} onValueChange={setTossDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Bat or Bowl" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bat">Bat</SelectItem>
                  <SelectItem value="bowl">Bowl</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {battingTeam && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Striker</Label>
              <PlayerSelect
                value={striker}
                onChange={setStriker}
                players={batters ?? []}
              />
            </div>

            <div>
              <Label>Non-striker</Label>
              <PlayerSelect
                value={nonStriker}
                onChange={setNonStriker}
                players={(batters ?? []).filter((p) => p.id !== striker)}
              />
            </div>

            <div>
              <Label>Opening Bowler</Label>
              <PlayerSelect
                value={bowler}
                onChange={setBowler}
                players={bowlers ?? []}
              />
            </div>
          </div>
        )}

        {battingTeam && (batters ?? []).length === 0 && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            No players found in this team. Please add players to the team first via Admin → Teams.
          </div>
        )}

        <div className="mt-6">
          <Button
            disabled={!canStart || busy}
            onClick={start}
            className="bg-green-600 text-white hover:bg-green-500"
          >
            {busy ? "Starting…" : "Start Innings"}
          </Button>
        </div>
      </Card>
    </section>
  );
}

function PlayerSelect({
  value,
  onChange,
  players,
}: {
  value: string;
  onChange: (v: string) => void;
  players: Player[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={players.length ? "Select" : "No players"} />
      </SelectTrigger>
      <SelectContent>
        {players.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function useTeamPlayers(teamId?: string) {
  return useQuery({
    queryKey: ["team_players_full", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_players")
        .select("players(id, full_name)")
        .eq("team_id", teamId!);

      if (error) throw error;

      return ((data ?? []) as any[])
        .map((r) => r.players)
        .filter(Boolean) as Player[];
    },
  });
}

function ScoringBoard({
  match,
  innings,
  onChange,
}: {
  match: Match;
  innings: Innings;
  onChange: () => void;
}) {
  const qc = useQueryClient();

  const stored =
    typeof window !== "undefined"
      ? localStorage.getItem(`mcc.inn.${innings.id}`)
      : null;

  const initActive = stored
    ? JSON.parse(stored)
    : { striker: "", nonStriker: "", bowler: "" };

  const [striker, setStriker] = useState<string>(initActive.striker);
  const [nonStriker, setNonStriker] = useState<string>(initActive.nonStriker);
  const [bowler, setBowler] = useState<string>(initActive.bowler);

  const persistActive = (s: string, ns: string, b: string) => {
    setStriker(s);
    setNonStriker(ns);
    setBowler(b);

    localStorage.setItem(
      `mcc.inn.${innings.id}`,
      JSON.stringify({ striker: s, nonStriker: ns, bowler: b })
    );
  };

  const { data: batters } = useTeamPlayers(innings.batting_team_id);
  const { data: bowlers } = useTeamPlayers(innings.bowling_team_id);

  const { data: batCards } = useQuery({
    queryKey: ["bat_cards", match.id, innings.id],
    queryFn: async () =>
      (
        await supabase
          .from("batting_scorecards")
          .select("*")
          .eq("match_id", match.id)
      ).data ?? [],
  });

  const { data: bowlCards } = useQuery({
    queryKey: ["bowl_cards", match.id, innings.id],
    queryFn: async () =>
      (
        await supabase
          .from("bowling_scorecards")
          .select("*")
          .eq("match_id", match.id)
      ).data ?? [],
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["bat_cards", match.id, innings.id] });
    qc.invalidateQueries({ queryKey: ["bowl_cards", match.id, innings.id] });
    onChange();
  };

  const playerName = (id?: string) =>
    batters?.find((p) => p.id === id)?.full_name ||
    bowlers?.find((p) => p.id === id)?.full_name ||
    "—";

  const battingTeamName =
    innings.batting_team_id === match.team_a
      ? match.a?.name ?? "Team A"
      : match.b?.name ?? "Team B";

  const oversDisplay = `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`;

  const strikerCard = batCards?.find((c: any) => c.player_id === striker);
  const nonStrikerCard = batCards?.find((c: any) => c.player_id === nonStriker);

  const bowlerCard = bowlCards?.find(
    (c: any) =>
      c.player_id === bowler && c.team_id === innings.bowling_team_id
  );

  const [wicketOpen, setWicketOpen] = useState(false);
  const [newBowlerOpen, setNewBowlerOpen] = useState(false);
  const [endInningsOpen, setEndInningsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const inningsLimitReached =
    innings.wickets >= 10 ||
    Math.floor(innings.balls / 6) >= (match.overs ?? 20);

  const recordBall = async (opts: {
    runs: number;
    extras_type?: string;
    extras_runs?: number;
    is_wicket?: boolean;
    dismissal_type?: string;
    out_player_id?: string;
    new_batsman_id?: string;
  }) => {
    if (!striker || !bowler) {
      toast.error("Set striker and bowler first");
      return;
    }

    setBusy(true);

    try {
      const extrasType = opts.extras_type ?? "none";

      const isLegal =
        extrasType === "none" ||
        extrasType === "bye" ||
        extrasType === "legbye";

      const totalRuns = (opts.runs ?? 0) + (opts.extras_runs ?? 0);
      const overNo = Math.floor(innings.balls / 6);
      const ballNo = (innings.balls % 6) + 1;

      const { error: be } = await supabase.from("balls").insert({
        innings_id: innings.id,
        over_no: overNo,
        ball_no: ballNo,
        batsman_id: striker,
        non_striker_id: nonStriker,
        bowler_id: bowler,
        runs: opts.runs ?? 0,
        extras_type: extrasType,
        extras_runs: opts.extras_runs ?? 0,
        is_wicket: !!opts.is_wicket,
        dismissal_type: opts.dismissal_type ?? null,
        out_player_id: opts.out_player_id ?? null,
        new_batsman_id: opts.new_batsman_id ?? null,
      });

      if (be) throw be;

      const newBalls = innings.balls + (isLegal ? 1 : 0);
      const newOvers = newBalls / 6;

      const { error: ie } = await supabase
        .from("innings")
        .update({
          runs: innings.runs + totalRuns,
          wickets: innings.wickets + (opts.is_wicket ? 1 : 0),
          balls: newBalls,
          overs: newOvers,
        })
        .eq("id", innings.id);

      if (ie) throw ie;

      if (strikerCard) {
        const addRuns =
          extrasType === "bye" || extrasType === "legbye"
            ? 0
            : opts.runs ?? 0;

        const addBalls = isLegal ? 1 : 0;

        await supabase
          .from("batting_scorecards")
          .update({
            runs: (strikerCard.runs ?? 0) + addRuns,
            balls: (strikerCard.balls ?? 0) + addBalls,
            fours: (strikerCard.fours ?? 0) + (opts.runs === 4 ? 1 : 0),
            sixes: (strikerCard.sixes ?? 0) + (opts.runs === 6 ? 1 : 0),
            dismissal:
              opts.is_wicket &&
              (opts.out_player_id ?? striker) === striker
                ? opts.dismissal_type ?? "out"
                : strikerCard.dismissal,
          })
          .eq("id", strikerCard.id);
      }

      if (bowlerCard) {
        const conceded =
          extrasType === "bye" || extrasType === "legbye"
            ? 0
            : totalRuns;

        const addLegal = isLegal ? 1 : 0;
        const newBallsForBowler = (bowlerCard.overs ?? 0) * 6 + addLegal;

        await supabase
          .from("bowling_scorecards")
          .update({
            runs: (bowlerCard.runs ?? 0) + conceded,
            overs: Math.floor(newBallsForBowler) / 6,
            wickets:
              (bowlerCard.wickets ?? 0) +
              (opts.is_wicket && opts.dismissal_type !== "runout" ? 1 : 0),
          })
          .eq("id", bowlerCard.id);
      }

      const scoreStr = `${innings.runs + totalRuns}/${
        innings.wickets + (opts.is_wicket ? 1 : 0)
      } (${oversForDisplay(newBalls)})`;

      const scoreCol =
        innings.batting_team_id === match.team_a ? "score_a" : "score_b";

      await supabase
        .from("matches")
        .update({ [scoreCol]: scoreStr })
        .eq("id", match.id);

      if (opts.is_wicket && (opts.out_player_id ?? striker) === striker) {
        if (opts.new_batsman_id) {
          const exists = batCards?.some(
            (c: any) => c.player_id === opts.new_batsman_id
          );

          if (!exists) {
            await supabase.from("batting_scorecards").insert({
              match_id: match.id,
              player_id: opts.new_batsman_id,
              team_id: innings.batting_team_id,
              runs: 0,
              balls: 0,
            });
          }

          persistActive(opts.new_batsman_id, nonStriker, bowler);
        }
      } else {
        if ((opts.runs ?? 0) % 2 === 1) {
          persistActive(nonStriker, striker, bowler);
        }
      }

      refreshAll();

      const finalBalls = newBalls;

      if (isLegal && finalBalls % 6 === 0) {
        persistActive(nonStriker, striker, "");
        setNewBowlerOpen(true);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const undoLastBall = async () => {
    setBusy(true);

    try {
      const { data: last } = await supabase
        .from("balls")
        .select("*")
        .eq("innings_id", innings.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!last) {
        toast.error("Nothing to undo");
        return;
      }

      const l = last as Ball;
      const extrasType = l.extras_type ?? "none";

      const isLegal =
        extrasType === "none" ||
        extrasType === "bye" ||
        extrasType === "legbye";

      const totalRuns = (l.runs ?? 0) + (l.extras_runs ?? 0);
      const newBalls = Math.max(0, innings.balls - (isLegal ? 1 : 0));

      await supabase
        .from("innings")
        .update({
          runs: Math.max(0, innings.runs - totalRuns),
          wickets: Math.max(0, innings.wickets - (l.is_wicket ? 1 : 0)),
          balls: newBalls,
          overs: newBalls / 6,
        })
        .eq("id", innings.id);

      await supabase.from("balls").delete().eq("id", l.id);

      const card = batCards?.find((c: any) => c.player_id === l.batsman_id);

      if (card) {
        const addRuns =
          extrasType === "bye" || extrasType === "legbye"
            ? 0
            : l.runs ?? 0;

        await supabase
          .from("batting_scorecards")
          .update({
            runs: Math.max(0, (card.runs ?? 0) - addRuns),
            balls: Math.max(0, (card.balls ?? 0) - (isLegal ? 1 : 0)),
            fours: Math.max(0, (card.fours ?? 0) - (l.runs === 4 ? 1 : 0)),
            sixes: Math.max(0, (card.sixes ?? 0) - (l.runs === 6 ? 1 : 0)),
          })
          .eq("id", card.id);
      }

      const bc = bowlCards?.find((c: any) => c.player_id === l.bowler_id);

      if (bc) {
        const conceded =
          extrasType === "bye" || extrasType === "legbye"
            ? 0
            : totalRuns;

        const newBallsBowler = Math.max(
          0,
          (bc.overs ?? 0) * 6 - (isLegal ? 1 : 0)
        );

        await supabase
          .from("bowling_scorecards")
          .update({
            runs: Math.max(0, (bc.runs ?? 0) - conceded),
            overs: Math.floor(newBallsBowler) / 6,
            wickets: Math.max(
              0,
              (bc.wickets ?? 0) -
                (l.is_wicket && l.dismissal_type !== "runout" ? 1 : 0)
            ),
          })
          .eq("id", bc.id);
      }

      const scoreStr = `${Math.max(0, innings.runs - totalRuns)}/${Math.max(
        0,
        innings.wickets - (l.is_wicket ? 1 : 0)
      )} (${oversForDisplay(newBalls)})`;

      const scoreCol =
        innings.batting_team_id === match.team_a ? "score_a" : "score_b";

      await supabase
        .from("matches")
        .update({ [scoreCol]: scoreStr })
        .eq("id", match.id);

      toast.success("Last ball undone");
      refreshAll();
    } catch (e: any) {
      toast.error(e.message ?? "Undo failed");
    } finally {
      setBusy(false);
    }
  };

  const endInnings = async () => {
    setBusy(true);

    try {
      await supabase
        .from("innings")
        .update({ is_closed: true })
        .eq("id", innings.id);

      toast.success("Innings closed");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      setEndInningsOpen(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl">{battingTeamName}</div>

          <div className="font-display text-4xl font-bold">
            {innings.runs}/{innings.wickets}
          </div>

          <div className="text-sm text-muted-foreground">
            {oversDisplay} ov / {match.overs}
          </div>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          Innings {innings.innings_no}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">Batsmen</h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Row
            label={`★ ${playerName(striker) || "Striker"}`}
            bold
            value={`${strikerCard?.runs ?? 0} (${strikerCard?.balls ?? 0})`}
          />

          <Row
            label={playerName(nonStriker) || "Non-striker"}
            value={`${nonStrikerCard?.runs ?? 0} (${nonStrikerCard?.balls ?? 0})`}
          />
        </div>

        <h3 className="mt-4 font-semibold mb-2">Bowler</h3>

        <div className="text-sm">
          <Row
            label={playerName(bowler) || "—"}
            value={`${(bowlerCard?.overs ?? 0).toFixed(1)}–${bowlerCard?.runs ?? 0}–${bowlerCard?.wickets ?? 0}`}
          />
        </div>

        {!bowler && (
          <div className="mt-3">
            <Button size="sm" onClick={() => setNewBowlerOpen(true)}>
              Select Bowler
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">Runs</h3>

        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 6].map((n) => (
            <Button
              key={n}
              variant={n === 4 || n === 6 ? "default" : "outline"}
              disabled={busy}
              className={
                n === 4
                  ? "bg-blue-600 text-white"
                  : n === 6
                    ? "bg-purple-600 text-white"
                    : ""
              }
              onClick={() => recordBall({ runs: n })}
            >
              {n}
            </Button>
          ))}
        </div>

        <h3 className="mt-4 font-semibold mb-2">Extras</h3>

        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              recordBall({ runs: 0, extras_type: "wide", extras_runs: 1 })
            }
          >
            Wide
          </Button>

          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              recordBall({ runs: 0, extras_type: "noball", extras_runs: 1 })
            }
          >
            No Ball
          </Button>

          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              recordBall({ runs: 0, extras_type: "bye", extras_runs: 1 })
            }
          >
            Bye
          </Button>

          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              recordBall({ runs: 0, extras_type: "legbye", extras_runs: 1 })
            }
          >
            Leg Bye
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => setWicketOpen(true)}
          >
            🔴 WICKET
          </Button>

          <Button variant="outline" disabled={busy} onClick={undoLastBall}>
            ↩ Undo Last Ball
          </Button>
        </div>

        {inningsLimitReached && (
          <div className="mt-4">
            <Button
              onClick={() => setEndInningsOpen(true)}
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
            >
              End Innings
            </Button>
          </div>
        )}
      </Card>

      <WicketDialog
        open={wicketOpen}
        onOpenChange={setWicketOpen}
        striker={striker}
        nonStriker={nonStriker}
        batters={batters ?? []}
        batCards={batCards ?? []}
        onConfirm={(payload) => {
          setWicketOpen(false);
          recordBall({ runs: 0, is_wicket: true, ...payload });
        }}
      />

      <SelectBowlerDialog
        open={newBowlerOpen}
        onOpenChange={setNewBowlerOpen}
        bowlers={bowlers ?? []}
        excludeId={bowler}
        onPick={async (id) => {
          const exists = bowlCards?.some((c: any) => c.player_id === id);

          if (!exists) {
            await supabase.from("bowling_scorecards").insert({
              match_id: match.id,
              player_id: id,
              team_id: innings.bowling_team_id,
              overs: 0,
              runs: 0,
              wickets: 0,
            });
          }

          persistActive(striker, nonStriker, id);
          setNewBowlerOpen(false);
          refreshAll();
        }}
      />

      <Dialog open={endInningsOpen} onOpenChange={setEndInningsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End innings?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            This closes innings {innings.innings_no}.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEndInningsOpen(false)}>
              Cancel
            </Button>

            <Button onClick={endInnings} disabled={busy}>
              End Innings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function oversForDisplay(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 ${
        bold ? "font-semibold bg-muted" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function WicketDialog({
  open,
  onOpenChange,
  striker,
  nonStriker,
  batters,
  batCards,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  striker: string;
  nonStriker: string;
  batters: Player[];
  batCards: any[];
  onConfirm: (p: {
    dismissal_type: string;
    new_batsman_id?: string;
    out_player_id?: string;
  }) => void;
}) {
  const [type, setType] = useState("bowled");
  const [newB, setNewB] = useState("");

  const usedIds = new Set(batCards.map((c) => c.player_id));
  usedIds.add(striker);
  usedIds.add(nonStriker);

  const remaining = batters.filter((p) => !usedIds.has(p.id));

  useEffect(() => {
    if (open) {
      setType("bowled");
      setNewB("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wicket</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Dismissal type</Label>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {[
                  ["bowled", "Bowled"],
                  ["caught", "Caught"],
                  ["lbw", "LBW"],
                  ["runout", "Run Out"],
                  ["stumped", "Stumped"],
                  ["hitwicket", "Hit Wicket"],
                ].map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>New batsman</Label>

            <Select value={newB} onValueChange={setNewB}>
              <SelectTrigger>
                <SelectValue
                  placeholder={remaining.length ? "Select" : "No players left"}
                />
              </SelectTrigger>

              <SelectContent>
                {remaining.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button
            disabled={!newB && remaining.length > 0}
            onClick={() =>
              onConfirm({
                dismissal_type: type,
                new_batsman_id: newB || undefined,
                out_player_id: striker,
              })
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectBowlerDialog({
  open,
  onOpenChange,
  bowlers,
  excludeId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bowlers: Player[];
  excludeId: string;
  onPick: (id: string) => void;
}) {
  const [pick, setPick] = useState("");

  useEffect(() => {
    if (open) setPick("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select next bowler</DialogTitle>
        </DialogHeader>

        <Select value={pick} onValueChange={setPick}>
          <SelectTrigger>
            <SelectValue placeholder="Bowler" />
          </SelectTrigger>

          <SelectContent>
            {bowlers
              .filter((p) => p.id !== excludeId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button disabled={!pick} onClick={() => onPick(pick)}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InningsBreak({
  match,
  firstInnings,
  onStart,
}: {
  match: Match;
  firstInnings: Innings;
  onStart: () => void;
}) {
  const battingNext =
    firstInnings.batting_team_id === match.team_a ? match.team_b : match.team_a;

  return (
    <SetupScreen
      match={match}
      inningsNo={2}
      onDone={onStart}
      forcedBattingTeam={battingNext}
    />
  );
}

function CompleteForm({
  match,
  innings,
  onComplete,
}: {
  match: Match;
  innings: Innings[];
  onComplete: () => void;
}) {
  const inn1 = innings.find((i) => i.innings_no === 1)!;
  const inn2 = innings.find((i) => i.innings_no === 2)!;

  const teamARuns = (match.team_a === inn1.batting_team_id ? inn1 : inn2).runs;
  const teamBRuns = (match.team_b === inn1.batting_team_id ? inn1 : inn2).runs;

  const winnerId =
    teamARuns === teamBRuns
      ? null
      : teamARuns > teamBRuns
        ? match.team_a
        : match.team_b;

  const winnerName =
    winnerId === match.team_a
      ? match.a?.name
      : winnerId === match.team_b
        ? match.b?.name
        : "Tie";

  const margin =
    teamARuns === teamBRuns
      ? "Match tied"
      : winnerId === inn2.batting_team_id
        ? `${winnerName} won by ${10 - inn2.wickets} wickets`
        : `${winnerName} won by ${Math.abs(teamARuns - teamBRuns)} runs`;

  const { data: allPlayers } = useQuery({
    queryKey: ["all_players_simple"],
    queryFn: async () =>
      (
        await supabase
          .from("players")
          .select("id, full_name")
          .order("full_name")
      ).data ?? [],
  });

  const [motm, setMotm] = useState("");
  const [busy, setBusy] = useState(false);

  const complete = async () => {
    setBusy(true);

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "completed",
          winner_id: winnerId,
          result_description: margin,
          man_of_match_id: motm || null,
          motm_player_id: motm || null,
        })
        .eq("id", match.id);

      if (error) throw error;

      toast.success("Match completed");
      onComplete();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6 text-center">
        <h1 className="font-display text-3xl">Match Complete</h1>

        <p className="mt-2 text-lg font-semibold">{margin}</p>

        <div className="mt-4 text-sm text-muted-foreground">
          {match.a?.name}: {teamARuns} · {match.b?.name}: {teamBRuns}
        </div>

        <div className="mt-6 text-left">
          <Label>Man of the Match</Label>

          <Select value={motm} onValueChange={setMotm}>
            <SelectTrigger>
              <SelectValue placeholder="Select player" />
            </SelectTrigger>

            <SelectContent>
              {(allPlayers ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="mt-6 bg-green-600 text-white hover:bg-green-500"
          disabled={busy}
          onClick={complete}
        >
          {busy ? "Saving…" : "Complete Match"}
        </Button>
      </Card>
    </section>
  );
}

function CompletedScreen({
  match,
  innings,
}: {
  match: Match;
  innings: Innings[];
}) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6 text-center">
        <h1 className="font-display text-3xl">Match Completed</h1>

        <p className="mt-2 text-lg font-semibold">{match.result_description}</p>

        <div className="mt-4 text-sm text-muted-foreground">
          {match.a?.name}: {match.score_a || "—"} · {match.b?.name}:{" "}
          {match.score_b || "—"}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {innings.length} innings recorded
        </div>
      </Card>
    </section>
  );
}