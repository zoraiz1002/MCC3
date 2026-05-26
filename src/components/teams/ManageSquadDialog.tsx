import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES = ["batsman", "bowler", "all-rounder", "wicket-keeper"];
const BATTING = ["Right-handed", "Left-handed"];
const BOWLING = [
  "Right arm fast", "Right arm medium", "Right arm off-spin", "Right arm leg-spin",
  "Left arm fast", "Left arm medium", "Left arm orthodox", "Left arm chinaman",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teamId: string;
  teamName: string;
}

export function ManageSquadDialog({ open, onOpenChange, teamId, teamName }: Props) {
  const qc = useQueryClient();
  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["teams"] });
    qc.invalidateQueries({ queryKey: ["team", teamId] });
    qc.invalidateQueries({ queryKey: ["team_players", teamId] });
    qc.invalidateQueries({ queryKey: ["players_all_for_team", teamId] });
  };

  // Current squad
  const squad = useQuery({
    queryKey: ["team_players", teamId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_players")
        .select("player_id, players(id,full_name,role,jersey_number)")
        .eq("team_id", teamId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // All players (for the Add list)
  const allPlayers = useQuery({
    queryKey: ["players_all_for_team", teamId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id,full_name,role,jersey_number")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const inTeam = useMemo(() => new Set((squad.data ?? []).map((r: any) => r.player_id)), [squad.data]);
  const [q, setQ] = useState("");
  const available = useMemo(() => {
    return (allPlayers.data ?? [])
      .filter((p: any) => !inTeam.has(p.id))
      .filter((p: any) => p.full_name.toLowerCase().includes(q.toLowerCase()));
  }, [allPlayers.data, inTeam, q]);

  const [busyId, setBusyId] = useState<string | null>(null);

  const addPlayer = async (playerId: string) => {
    setBusyId(playerId);
    try {
      const { error } = await supabase.from("team_players").insert({ team_id: teamId, player_id: playerId });
      if (error) throw error;
      toast.success("Player added");
      await Promise.all([squad.refetch(), allPlayers.refetch()]);
      refetchAll();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add player");
    } finally {
      setBusyId(null);
    }
  };

  const removePlayer = async (playerId: string) => {
    setBusyId(playerId);
    try {
      const { error } = await supabase
        .from("team_players")
        .delete()
        .eq("team_id", teamId)
        .eq("player_id", playerId);
      if (error) throw error;
      toast.success("Player removed");
      await Promise.all([squad.refetch(), allPlayers.refetch()]);
      refetchAll();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove player");
    } finally {
      setBusyId(null);
    }
  };

  // Create new player form
  const [nf, setNf] = useState({ full_name: "", role: "", batting_style: "", bowling_style: "", phone: "", jersey_number: "" });
  const [creating, setCreating] = useState(false);
  const createAndAdd = async () => {
    if (!nf.full_name.trim()) { toast.error("Full name required"); return; }
    setCreating(true);
    try {
      const payload: any = {
        full_name: nf.full_name.trim(),
        role: nf.role || null,
        batting_style: nf.batting_style || null,
        bowling_style: nf.bowling_style || null,
        phone: nf.phone || null,
        jersey_number: nf.jersey_number ? Number(nf.jersey_number) : null,
        is_active: true,
      };
      const { data: player, error } = await supabase.from("players").insert(payload).select().single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("team_players").insert({ team_id: teamId, player_id: player.id });
      if (e2) throw e2;
      toast.success("Player created and added to team");
      setNf({ full_name: "", role: "", batting_style: "", bowling_style: "", phone: "", jersey_number: "" });
      await Promise.all([squad.refetch(), allPlayers.refetch()]);
      refetchAll();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create player");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Manage Squad — {teamName}</DialogTitle></DialogHeader>
        <Tabs defaultValue="current">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="current">Current Squad</TabsTrigger>
            <TabsTrigger value="add">Add Players</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>

          {/* Current Squad */}
          <TabsContent value="current" className="space-y-3">
            <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
              {squad.isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
              {squad.error && <div className="p-4 text-sm text-destructive">Failed to load squad.</div>}
              {!squad.isLoading && (squad.data ?? []).length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No players in this squad yet.</div>
              )}
              {(squad.data ?? []).map((row: any) => row.players && (
                <div key={row.player_id} className="flex items-center gap-3 p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{row.players.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.players.role || "—"}{row.players.jersey_number ? ` · #${row.players.jersey_number}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === row.player_id}
                    onClick={() => removePlayer(row.player_id)}
                  >
                    {busyId === row.player_id ? "Removing…" : "Remove"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Add Players */}
          <TabsContent value="add" className="space-y-3">
            <Input placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
              {(squad.isLoading || allPlayers.isLoading) && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
              {(squad.error || allPlayers.error) && <div className="p-4 text-sm text-destructive">Failed to load players.</div>}
              {!squad.isLoading && !allPlayers.isLoading && available.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No available players.</div>
              )}
              {available.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.role || "—"}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</div>
                  </div>
                  <Button
                    size="sm"
                    disabled={busyId === p.id}
                    className="bg-green-600 text-white hover:bg-green-500"
                    onClick={() => addPlayer(p.id)}
                  >
                    {busyId === p.id ? "Adding…" : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Create New Player */}
          <TabsContent value="new" className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input value={nf.full_name} onChange={(e) => setNf({ ...nf, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={nf.role} onValueChange={(v) => setNf({ ...nf, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jersey #</Label>
                <Input type="number" value={nf.jersey_number} onChange={(e) => setNf({ ...nf, jersey_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Batting style</Label>
                <Select value={nf.batting_style} onValueChange={(v) => setNf({ ...nf, batting_style: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{BATTING.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bowling style</Label>
                <Select value={nf.bowling_style} onValueChange={(v) => setNf({ ...nf, bowling_style: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{BOWLING.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Phone</Label>
                <Input value={nf.phone} onChange={(e) => setNf({ ...nf, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={createAndAdd} disabled={creating} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {creating ? "Saving…" : "Create & Add to Team"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
