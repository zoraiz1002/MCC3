import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/storage";
import { useMyPlayer } from "@/hooks/use-data";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return <PageShell><div className="mx-auto max-w-6xl p-10"><CardGridSkeleton count={3} /></div></PageShell>;
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-5xl">My Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back.</p>
        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">My Stats</TabsTrigger>
            <TabsTrigger value="matches">My Matches</TabsTrigger>
            <TabsTrigger value="team">My Team</TabsTrigger>
            <TabsTrigger value="profile">Edit Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6"><OverviewTab userId={user.id} /></TabsContent>
          <TabsContent value="stats" className="mt-6"><StatsTab userId={user.id} /></TabsContent>
          <TabsContent value="matches" className="mt-6"><MatchesTab userId={user.id} /></TabsContent>
          <TabsContent value="team" className="mt-6"><TeamTab userId={user.id} /></TabsContent>
          <TabsContent value="profile" className="mt-6"><ProfileTab userId={user.id} /></TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}

// ---------------- Overview ----------------
function OverviewTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: player, isLoading } = useMyPlayer(userId);
  const { data: stats } = useQuery({
    queryKey: ["my_stats", player?.id], enabled: !!player?.id,
    queryFn: async () => (await supabase.from("player_stats").select("*").eq("player_id", player.id).maybeSingle()).data,
  });
  const { data: nextMatch } = useQuery({
    queryKey: ["next_match"],
    queryFn: async () => (await supabase.from("matches").select("*, a:teams!matches_team_a_fkey(name), b:teams!matches_team_b_fkey(name)").eq("status", "scheduled").order("match_date").limit(1).maybeSingle()).data,
  });
  const { data: avail } = useQuery({
    queryKey: ["avail", player?.id, nextMatch?.id], enabled: !!player?.id && !!nextMatch?.id,
    queryFn: async () => (await supabase.from("player_availability").select("available").eq("player_id", player.id).eq("match_id", nextMatch.id).maybeSingle()).data,
  });
  const toggle = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase.from("player_availability").upsert({ player_id: player!.id, match_id: nextMatch!.id, available: val, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Availability updated"); qc.invalidateQueries({ queryKey: ["avail"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <CardGridSkeleton count={3} />;
  if (!player) {
    return (
      <Card className="p-8 text-center">
        <h2 className="font-display text-2xl">Complete Your Player Profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">You haven't linked a player profile yet. Ask an admin to create one for you, or fill in your profile below.</p>
        <Link to="/dashboard" search={{} as any}><Button className="mt-4">Go to Edit Profile</Button></Link>
      </Card>
    );
  }
  const team = player.team_players?.[0]?.teams;
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Card className="p-6 md:col-span-3">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
            {player.photo_url && <img src={player.photo_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <div className="font-display text-3xl">{player.full_name}</div>
            <div className="text-sm text-muted-foreground">{player.role}{team ? ` · ${team.name}` : ""}</div>
          </div>
        </div>
      </Card>
      {[["Total Runs", stats?.runs ?? 0], ["Total Wickets", stats?.wickets ?? 0], ["Matches", stats?.matches ?? 0]].map(([k, v]) => (
        <Card key={k as string} className="p-6 text-center">
          <div className="text-xs text-muted-foreground">{k}</div>
          <div className="font-display text-4xl">{v as any}</div>
        </Card>
      ))}
      <Card className="p-6 md:col-span-3">
        <div className="text-xs text-muted-foreground">Next match</div>
        {nextMatch ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-2xl">{nextMatch.a?.name} vs {nextMatch.b?.name}</div>
              <div className="text-sm text-muted-foreground">{nextMatch.match_date && new Date(nextMatch.match_date).toLocaleString()} · {nextMatch.venue}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">Available</span>
              <Switch checked={avail?.available ?? false} onCheckedChange={(v) => toggle.mutate(v)} />
            </div>
          </div>
        ) : <div className="mt-2 text-sm text-muted-foreground">No upcoming match scheduled.</div>}
      </Card>
    </div>
  );
}

// ---------------- Stats ----------------
function StatsTab({ userId }: { userId: string }) {
  const { data: player } = useMyPlayer(userId);
  const { data: s, isLoading } = useQuery({
    queryKey: ["my_stats_full", player?.id], enabled: !!player?.id,
    queryFn: async () => (await supabase.from("player_stats").select("*").eq("player_id", player.id).maybeSingle()).data,
  });
  if (isLoading) return <CardGridSkeleton count={3} />;
  if (!player || !s) return <EmptyState title="No stats yet" hint="Stats appear once you've played." />;
  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between border-b py-2 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value ?? 0}</span></div>
  );
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Card className="p-6"><h3 className="font-display text-xl">Batting</h3>
        <Row label="Matches" value={s.matches}/><Row label="Innings" value={s.innings}/><Row label="Runs" value={s.runs}/>
        <Row label="Highest" value={s.highest_score}/><Row label="Average" value={Number(s.average).toFixed(2)}/>
        <Row label="Strike Rate" value={Number(s.strike_rate).toFixed(2)}/><Row label="50s" value={s.fifties}/><Row label="100s" value={s.hundreds}/>
      </Card>
      <Card className="p-6"><h3 className="font-display text-xl">Bowling</h3>
        <Row label="Matches" value={s.matches}/><Row label="Wickets" value={s.wickets}/><Row label="Overs" value={s.overs}/>
        <Row label="Runs Conceded" value={s.runs_conceded}/><Row label="Average" value={Number(s.bowling_avg).toFixed(2)}/>
        <Row label="Economy" value={Number(s.economy).toFixed(2)}/>
      </Card>
      <Card className="p-6"><h3 className="font-display text-xl">Fielding</h3>
        <Row label="Catches" value={s.catches}/><Row label="Run-outs" value={s.run_outs}/><Row label="Stumpings" value={s.stumpings}/>
      </Card>
    </div>
  );
}

// ---------------- My Matches ----------------
function MatchesTab({ userId }: { userId: string }) {
  const { data: player } = useMyPlayer(userId);
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["my_matches", player?.id], enabled: !!player?.id,
    queryFn: async () => (await supabase.from("batting_scorecards").select("*, matches(id,match_date,a:teams!matches_team_a_fkey(name),b:teams!matches_team_b_fkey(name))").eq("player_id", player.id).order("created_at", { ascending: false })).data ?? [],
  });
  if (isLoading) return <CardGridSkeleton count={2} />;
  if (error) return <ErrorState error={error} />;
  if (!rows || rows.length === 0) return <EmptyState title="No match records yet" />;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr><th className="p-3">Date</th><th className="p-3">Match</th><th className="p-3">Runs</th><th className="p-3">Balls</th><th className="p-3">Out</th></tr></thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">{r.matches?.match_date && new Date(r.matches.match_date).toLocaleDateString()}</td>
              <td className="p-3">{r.matches?.a?.name} vs {r.matches?.b?.name}</td>
              <td className="p-3 font-semibold">{r.runs}</td><td className="p-3">{r.balls}</td>
              <td className="p-3">{r.dismissal || "not out"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ---------------- My Team ----------------
function TeamTab({ userId }: { userId: string }) {
  const { data: player } = useMyPlayer(userId);
  const teamId = player?.team_players?.[0]?.team_id;
  const { data: team, isLoading } = useQuery({
    queryKey: ["my_team", teamId], enabled: !!teamId,
    queryFn: async () => (await supabase.from("teams").select("*, captain:players!teams_captain_id_fkey(id,full_name), vice:players!teams_vice_captain_id_fkey(id,full_name), team_players(players(id,full_name,role,photo_url))").eq("id", teamId).maybeSingle()).data,
  });
  if (!teamId) return <EmptyState title="You're not on a team yet" />;
  if (isLoading) return <CardGridSkeleton count={3} />;
  if (!team) return <EmptyState title="Team not found" />;
  return (
    <>
      <Card className="p-6">
        <div className="font-display text-3xl">{team.name}</div>
        <div className="text-sm text-muted-foreground">{team.category}</div>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(team.team_players ?? []).map((tp: any) => tp.players && (
          <Card key={tp.players.id} className={`p-4 text-center ${tp.players.id === team.captain?.id ? "border-secondary" : ""}`}>
            <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-muted">
              {tp.players.photo_url && <img src={tp.players.photo_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="mt-2 font-semibold">{tp.players.full_name}</div>
            <div className="text-xs text-muted-foreground">{tp.players.role}</div>
            {tp.players.id === team.captain?.id && <div className="mt-1 text-xs font-bold text-secondary">CAPTAIN</div>}
            {tp.players.id === team.vice?.id && <div className="mt-1 text-xs font-bold">VICE</div>}
          </Card>
        ))}
      </div>
    </>
  );
}

// ---------------- Profile ----------------
const profileSchema = z.object({
  full_name: z.string().min(1).max(100),
  phone: z.string().max(30).optional().or(z.literal("")),
  role: z.string().max(50).optional().or(z.literal("")),
  batting_style: z.string().max(20).optional().or(z.literal("")),
  bowling_style: z.string().max(50).optional().or(z.literal("")),
  jersey_number: z.coerce.number().int().min(0).max(999).optional().nullable(),
  bio: z.string().max(500).optional().or(z.literal("")),
});
type ProfileForm = z.infer<typeof profileSchema>;

function ProfileTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: player } = useMyPlayer(userId);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: player?.full_name ?? "",
      phone: player?.phone ?? "",
      role: player?.role ?? "",
      batting_style: player?.batting_style ?? "",
      bowling_style: player?.bowling_style ?? "",
      jersey_number: player?.jersey_number ?? null,
      bio: player?.bio ?? "",
    },
  });

  useEffect(() => { if (player?.photo_url) setPhotoUrl(player.photo_url); }, [player?.photo_url]);

  const save = useMutation({
    mutationFn: async (v: ProfileForm) => {
      const payload = { ...v, photo_url: photoUrl, user_id: userId };
      if (player?.id) {
        const { error } = await supabase.from("players").update(payload).eq("id", player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("players").insert(payload);
        if (error) throw error;
      }
      const { error: pe } = await supabase.from("profiles").update({ full_name: v.full_name, phone: v.phone, avatar_url: photoUrl }).eq("id", userId);
      if (pe) throw pe;
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["my_player"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      setUploading(true);
      const url = await uploadImage("avatars", f);
      setPhotoUrl(url);
      toast.success("Photo uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
            {photoUrl && <img src={photoUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {([
          ["full_name", "Full Name"], ["phone", "Phone"], ["role", "Role (batsman/bowler/all-rounder/wicketkeeper)"],
          ["batting_style", "Batting Style"], ["bowling_style", "Bowling Style"], ["jersey_number", "Jersey #"],
        ] as const).map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input {...form.register(k as any)} type={k === "jersey_number" ? "number" : "text"} />
            {form.formState.errors[k as keyof ProfileForm] && <p className="mt-1 text-xs text-destructive">{form.formState.errors[k as keyof ProfileForm]?.message as string}</p>}
          </div>
        ))}
        <div className="md:col-span-2">
          <Label>Bio</Label>
          <Textarea {...form.register("bio")} rows={4} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={save.isPending} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {save.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
