import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

  // Existing team_players for this team (for exclusion).
  const existing = useQuery({
    queryKey: ["team_players", teamId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("team_players").select("player_id").eq("team_id", teamId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.player_id as string);
    },
  });

  const allPlayers = useQuery({
    queryKey: ["players_all_for_team", teamId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id,full_name,role,jersey_number").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const inTeam = new Set(existing.data ?? []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const available = useMemo(() => {
    return (allPlayers.data ?? [])
      .filter((p: any) => !inTeam.has(p.id))
      .filter((p: any) => p.full_name.toLowerCase().includes(q.toLowerCase()));
  }, [allPlayers.data, existing.data, q]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const [adding, setAdding] = useState(false);
  const addSelected = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      const rows = Array.from(selected).map((player_id) => ({ team_id: teamId, player_id }));
      const { error } = await supabase.from("team_players").insert(rows);
      if (error) throw error;
      toast.success(`Added ${selected.size} player(s) to ${teamName}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_players", teamId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add players");
    } finally {
      setAdding(false);
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
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["team_players", teamId] });
      onOpenChange(false);
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
        <Tabs defaultValue="existing">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="existing">Add Existing Player</TabsTrigger>
            <TabsTrigger value="new">Create New Player</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3">
            <Input placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
              {(existing.isLoading || allPlayers.isLoading) && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
              {(existing.error || allPlayers.error) && <div className="p-4 text-sm text-destructive">Failed to load players.</div>}
              {!existing.isLoading && !allPlayers.isLoading && available.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No available players.</div>
              )}
              {available.map((p: any) => (
                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.role || "—"}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={addSelected} disabled={adding || selected.size === 0} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {adding ? "Adding…" : `Add Selected (${selected.size})`}
              </Button>
            </div>
          </TabsContent>

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
