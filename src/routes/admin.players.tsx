import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { useCrud, useList } from "@/lib/crud";

export const Route = createFileRoute("/admin/players")({ component: Page });

const fields: Field[] = [
  { name: "full_name", label: "Full name", required: true },
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone" },
  { name: "dob", label: "Date of birth", type: "date" },
  { name: "role", label: "Role", type: "select", options: [
    { value: "batsman", label: "Batsman" },
    { value: "bowler", label: "Bowler" },
    { value: "all-rounder", label: "All-rounder" },
    { value: "wicket-keeper", label: "Wicket-keeper" },
  ]},
  { name: "batting_style", label: "Batting style", type: "select", options: [
    { value: "RHB", label: "Right-handed" }, { value: "LHB", label: "Left-handed" },
  ]},
  { name: "bowling_style", label: "Bowling style", placeholder: "e.g. RF, RM, LO" },
  { name: "jersey_number", label: "Jersey #", type: "number" },
  { name: "photo_url", label: "Photo URL" },
  { name: "bio", label: "Bio", type: "textarea" },
  { name: "is_active", label: "Active", type: "boolean" },
];

function Page() {
  const { data, isLoading } = useList<any>("players", { order: { column: "full_name" } });
  const { create, update, remove } = useCrud("players");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <>
      <CrudTable
        title="Players"
        rows={data ?? []}
        loading={isLoading}
        searchKeys={["full_name", "email"]}
        columns={[
          { key: "full_name", header: "Name" },
          { key: "role", header: "Role" },
          { key: "jersey_number", header: "#" },
          { key: "batting_style", header: "Bat" },
          { key: "bowling_style", header: "Bowl" },
          { key: "is_active", header: "Active", render: (r) => r.is_active ? "Yes" : "No" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => remove.mutate(r.id)}
      />
      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Edit player" : "Add player"}
        fields={fields}
        initial={editing}
        onSubmit={(v) => editing ? update.mutateAsync({ id: editing.id, patch: v }) : create.mutateAsync(v)}
      />
    </>
  );
}
