import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

export function ManageSquadDialog({ open, onOpenChange, teamId, teamName }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Current squad
  const { data: squad } = useQuery({
    queryKey: ["squad_manage", teamId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_players")
        .select("player_id, players(id, full_name, role)")
        .eq("team_id", teamId);
      return (data ?? []).map((r: any) => r.players).filter(Boolean);
    },
  });

  // All available players not in team
  const { data: available } = useQuery({
    queryKey: ["available_players", teamId],
    enabled: open,
    queryFn: async () => {
      const squadIds = (squad ?? []).map((p: any) => p.id);
      const { data } = await supabase
        .from("players")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name");
      return (data ?? []).filter((p: any) => !squadIds.includes(p.id));
    },
  });

  const addPlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("team_players")
        .insert({ team_id: teamId, player_id: playerId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Player added");
      qc.invalidateQueries({ queryKey: ["squad_manage", teamId] });
      qc.invalidateQueries({ queryKey: ["available_players", teamId] });
      qc.invalidateQueries({ queryKey: ["team", teamId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("team_players")
        .delete()
        .eq("team_id", teamId)
        .eq("player_id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Player removed");
      qc.invalidateQueries({ queryKey: ["squad_manage", teamId] });
      qc.invalidateQueries({ queryKey: ["available_players", teamId] });
      qc.invalidateQueries({ queryKey: ["team", teamId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredAvailable = (available ?? []).filter((p: any) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Squad — {teamName}</DialogTitle>
        </DialogHeader>

        {/* Current Squad */}
        <div className="mt-2">
          <h3 className="font-semibold text-sm mb-2">
            Current Squad ({(squad ?? []).length} players)
          </h3>
          {(squad ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No players yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(squad ?? []).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{p.full_name}</span>
                    {p.role && (
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {p.role}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePlayer.mutate(p.id)}
                    disabled={removePlayer.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Players */}
        <div className="mt-4 border-t pt-4">
          <h3 className="font-semibold text-sm mb-2">Add Players</h3>
          <Input
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          {filteredAvailable.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {search ? "No players match your search." : "All registered players are already in this team."}
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredAvailable.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{p.full_name}</span>
                    {p.role && (
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {p.role}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-500"
                    onClick={() => addPlayer.mutate(p.id)}
                    disabled={addPlayer.isPending}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}