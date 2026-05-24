import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMatches, useTeams, useTournaments } from "@/hooks/use-data";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/matches")({ component: Matches });

function badgeCls(s?: string) {
  return s === "live" ? "bg-destructive text-destructive-foreground animate-pulse"
    : s === "scheduled" ? "bg-secondary text-secondary-foreground"
    : "bg-muted text-foreground";
}

function Matches() {
  const { data, isLoading, error } = useMatches();
  const { isAdmin, isCaptain } = useAuth();
  const canManage = isAdmin || isCaptain;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <PageShell>
      <PageHero title="Matches" subtitle="Fixtures, live games, and results." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {canManage && (
          <div className="mb-6 flex justify-end">
            <Button onClick={() => setOpen(true)} className="bg-yellow-400 text-black hover:bg-yellow-300">+ Create Match</Button>
          </div>
        )}

        {isLoading && <CardGridSkeleton count={4} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !error && (data ?? []).length === 0 && <EmptyState title="No matches yet" />}
        {!isLoading && !error && (data ?? []).length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {(data ?? []).map((m: any) => {
              const canScore = canManage && (m.status === "scheduled" || m.status === "live");
              return (
                <Card key={m.id} className="p-6 transition-all hover:border-secondary">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badgeCls(m.status)}`}>
                      {m.status === "live" && "🔴 "}{(m.status ?? "").toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.match_date && new Date(m.match_date).toLocaleString()}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="font-display text-xl">{m.a?.name || m.a?.short_name || "Team A"}</div>
                    <div className="text-muted-foreground">vs</div>
                    <div className="font-display text-xl">{m.b?.name || m.b?.short_name || "Team B"}</div>
                  </div>
                  {(m.score_a || m.score_b) && (
                    <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{m.score_a} · {m.score_b}</div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">📍 {m.venue || "TBD"}</span>
                    <div className="flex gap-2">
                      {canScore && (
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-500"
                          onClick={() => navigate({ to: "/scoring", search: { matchId: m.id } })}
                        >
                          Score
                        </Button>
                      )}
                      <Link to="/matches/$id" params={{ id: m.id }}><Button size="sm" variant="outline">Details</Button></Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <CreateMatchDialog open={open} onOpenChange={setOpen} />
    </PageShell>
  );
}

// ------------------- Create Match Dialog -------------------
const createSchema = z.object({
  tournament_id: z.string().optional().or(z.literal("")),
  team_a: z.string().min(1, "Select Team A"),
  team_b: z.string().min(1, "Select Team B"),
  match_date: z.string().min(1, "Pick a date"),
  match_time: z.string().min(1, "Pick a time"),
  venue: z.string().max(120).optional().or(z.literal("")),
  overs: z.coerce.number().int().min(1).max(100),
  match_type: z.enum(["T20", "ODI", "T10", "Custom"]),
}).refine((v) => v.team_a !== v.team_b, { path: ["team_b"], message: "Team B must differ from Team A" });
type CreateForm = z.infer<typeof createSchema>;

function CreateMatchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: teams } = useTeams();
  const { data: tournaments } = useTournaments();
  const qc = useQueryClient();

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { tournament_id: "", team_a: "", team_b: "", match_date: "", match_time: "", venue: "", overs: 20, match_type: "T20" },
  });
  const team_a = form.watch("team_a");

  const teamOptions = useMemo(() => (teams ?? []).map((t: any) => ({ id: t.id, name: t.name })), [teams]);

  const submit = form.handleSubmit(async (v) => {
    const iso = new Date(`${v.match_date}T${v.match_time}`).toISOString();
    const payload: any = {
      tournament_id: v.tournament_id || null,
      team_a: v.team_a,
      team_b: v.team_b,
      match_date: iso,
      venue: v.venue || null,
      overs: v.overs,
      match_type: v.match_type,
      status: "scheduled",
    };
    const { error } = await supabase.from("matches").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Match created");
    qc.invalidateQueries({ queryKey: ["matches"] });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Match</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Tournament (optional)</Label>
            <Select value={form.watch("tournament_id") || ""} onValueChange={(v) => form.setValue("tournament_id", v)}>
              <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
              <SelectContent>
                {(tournaments ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Team A *</Label>
              <Select value={form.watch("team_a")} onValueChange={(v) => form.setValue("team_a", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {teamOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.team_a && <p className="mt-1 text-xs text-destructive">{form.formState.errors.team_a.message}</p>}
            </div>
            <div>
              <Label>Team B *</Label>
              <Select value={form.watch("team_b")} onValueChange={(v) => form.setValue("team_b", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {teamOptions.filter((t) => t.id !== team_a).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.team_b && <p className="mt-1 text-xs text-destructive">{form.formState.errors.team_b.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" {...form.register("match_date")} />
            </div>
            <div>
              <Label>Time *</Label>
              <Input type="time" {...form.register("match_time")} />
            </div>
          </div>
          <div>
            <Label>Venue</Label>
            <Input {...form.register("venue")} placeholder="Ground / city" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Overs</Label>
              <Input type="number" {...form.register("overs")} />
            </div>
            <div>
              <Label>Match Type</Label>
              <Select value={form.watch("match_type")} onValueChange={(v) => form.setValue("match_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["T20", "ODI", "T10", "Custom"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-yellow-400 text-black hover:bg-yellow-300">
              {form.formState.isSubmitting ? "Saving…" : "Create Match"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
