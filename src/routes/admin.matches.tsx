import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { useCrud, useList } from "@/lib/crud";

export const Route = createFileRoute("/admin/matches")({ component: Page });

function Page() {
  const { data: matches, isLoading } = useList<any>("matches", { order: { column: "match_date", ascending: false } });
  const { data: teams } = useList<any>("teams", { order: { column: "name" } });
  const { data: tournaments } = useList<any>("tournaments", { order: { column: "name" } });
  const { create, update, remove } = useCrud("matches");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const teamOptions = useMemo(() => (teams ?? []).map((t: any) => ({ value: t.id, label: t.name })), [teams]);
  const tourOptions = useMemo(() => [{ value: "", label: "— None —" }, ...((tournaments ?? []).map((t: any) => ({ value: t.id, label: t.name })))], [tournaments]);
  const teamName = (id: string) => teams?.find((t: any) => t.id === id)?.short_name || teams?.find((t: any) => t.id === id)?.name || "—";

  const fields: Field[] = [
    { name: "tournament_id", label: "Tournament", type: "select", options: tourOptions },
    { name: "team_a", label: "Team A", type: "select", options: teamOptions, required: true },
    { name: "team_b", label: "Team B", type: "select", options: teamOptions, required: true },
    { name: "match_date", label: "Date / time", type: "datetime-local", required: true },
    { name: "venue", label: "Venue" },
    { name: "overs", label: "Overs", type: "number" },
    { name: "match_type", label: "Match type", type: "select", options: [
      { value: "T20", label: "T20" }, { value: "ODI", label: "ODI" }, { value: "Test", label: "Test" }, { value: "T10", label: "T10" },
    ]},
    { name: "status", label: "Status", type: "select", options: [
      { value: "scheduled", label: "Scheduled" }, { value: "live", label: "Live" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
    ]},
    { name: "winner_id", label: "Winner", type: "select", options: [{ value: "", label: "— None —" }, ...teamOptions] },
    { name: "score_a", label: "Score A" },
    { name: "score_b", label: "Score B" },
    { name: "result_description", label: "Result description" },
  ];

  return (
    <>
      <CrudTable
        title="Matches" rows={matches ?? []} loading={isLoading}
        searchKeys={["venue", "status"]}
        columns={[
          { key: "match_date", header: "Date", render: (r) => r.match_date ? new Date(r.match_date).toLocaleString() : "—" },
          { key: "team_a", header: "Team A", render: (r) => teamName(r.team_a) },
          { key: "team_b", header: "Team B", render: (r) => teamName(r.team_b) },
          { key: "status", header: "Status" },
          { key: "venue", header: "Venue" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => remove.mutate(r.id)}
      />
      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Edit match" : "Schedule match"}
        fields={fields} initial={editing}
        onSubmit={(v) => {
          if (v.match_date) v.match_date = new Date(v.match_date).toISOString();
          return editing ? update.mutateAsync({ id: editing.id, patch: v }) : create.mutateAsync(v);
        }}
      />
    </>
  );
}
