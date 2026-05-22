import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { useCrud, useList } from "@/lib/crud";

export const Route = createFileRoute("/admin/teams")({ component: Page });

const fields: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "short_name", label: "Short name" },
  { name: "slug", label: "Slug" },
  { name: "category", label: "Category", placeholder: "e.g. Senior, U19, Women" },
  { name: "home_ground", label: "Home ground" },
  { name: "founded_year", label: "Founded", type: "number" },
  { name: "badge_url", label: "Badge URL" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "is_active", label: "Active", type: "boolean" },
];

function Page() {
  const { data, isLoading } = useList<any>("teams", { order: { column: "name" } });
  const { create, update, remove } = useCrud("teams");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <>
      <CrudTable
        title="Teams" rows={data ?? []} loading={isLoading}
        searchKeys={["name", "category"]}
        columns={[
          { key: "name", header: "Name" },
          { key: "short_name", header: "Short" },
          { key: "category", header: "Category" },
          { key: "home_ground", header: "Ground" },
          { key: "is_active", header: "Active", render: (r) => r.is_active ? "Yes" : "No" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => remove.mutate(r.id)}
      />
      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Edit team" : "Add team"}
        fields={fields} initial={editing}
        onSubmit={(v) => editing ? update.mutateAsync({ id: editing.id, patch: v }) : create.mutateAsync(v)}
      />
    </>
  );
}
