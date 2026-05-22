import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { useCrud, useList } from "@/lib/crud";

export const Route = createFileRoute("/admin/tournaments")({ component: Page });

const fields: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "format", label: "Format", type: "select", options: [
    { value: "league", label: "League" }, { value: "knockout", label: "Knockout" }, { value: "hybrid", label: "Hybrid" },
  ]},
  { name: "status", label: "Status", type: "select", options: [
    { value: "upcoming", label: "Upcoming" }, { value: "ongoing", label: "Ongoing" }, { value: "completed", label: "Completed" },
  ]},
  { name: "start_date", label: "Start date", type: "date" },
  { name: "end_date", label: "End date", type: "date" },
  { name: "venue", label: "Venue" },
  { name: "banner_url", label: "Banner URL" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "rules", label: "Rules", type: "textarea" },
  { name: "prize_info", label: "Prize info", type: "textarea" },
];

function Page() {
  const { data, isLoading } = useList<any>("tournaments", { order: { column: "start_date", ascending: false } });
  const { create, update, remove } = useCrud("tournaments");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <>
      <CrudTable
        title="Tournaments" rows={data ?? []} loading={isLoading}
        searchKeys={["name", "venue"]}
        columns={[
          { key: "name", header: "Name" },
          { key: "format", header: "Format" },
          { key: "status", header: "Status" },
          { key: "start_date", header: "Start" },
          { key: "end_date", header: "End" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => remove.mutate(r.id)}
      />
      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Edit tournament" : "Add tournament"}
        fields={fields} initial={editing}
        onSubmit={(v) => editing ? update.mutateAsync({ id: editing.id, patch: v }) : create.mutateAsync(v)}
      />
    </>
  );
}
