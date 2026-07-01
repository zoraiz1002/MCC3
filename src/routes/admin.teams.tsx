import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { Button } from "@/components/ui/button";
import { useCrud, useList } from "@/lib/crud";
import { ManageSquadDialog } from "@/components/teams/ManageSquadDialog";

export const Route = createFileRoute("/admin/teams")({ component: Page });

const fields: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "short_name", label: "Short name" },
  { name: "slug", label: "Slug" },
  { name: "category", label: "Category", placeholder: "e.g. Senior, U19, Women" },
  { name: "home_ground", label: "Home ground" },
  { name: "founded_year", label: "Founded", type: "number" },
  { name: "badge_url", label: "Upload Badge", type: "file", bucket: "team-badges" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "is_active", label: "Active", type: "boolean" },
];

function Page() {
  const { data, isLoading } = useList<any>("teams", { order: { column: "name" } });
  const { create, update, remove } = useCrud("teams");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [manageTeam, setManageTeam] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      <CrudTable
        title="Teams"
        rows={data ?? []}
        loading={isLoading}
        searchKeys={["name", "category"]}
        columns={[
          { key: "name", header: "Name" },
          { key: "short_name", header: "Short" },
          { key: "category", header: "Category" },
          { key: "home_ground", header: "Ground" },
          {
            key: "is_active",
            header: "Active",
            render: (r) => (r.is_active ? "Yes" : "No"),
          },
          {
            key: "squad",
            header: "Squad",
            render: (r) => (
              <Button
                size="sm"
                className="bg-yellow-400 text-black hover:bg-yellow-300"
                onClick={() => setManageTeam({ id: r.id, name: r.name })}
              >
                Manage Squad
              </Button>
            ),
          },
        ]}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        onEdit={(r) => {
          setEditing(r);
          setOpen(true);
        }}
        onDelete={(r) => remove.mutate(r.id)}
      />

      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit team" : "Add team"}
        fields={fields}
        initial={editing}
        onSubmit={(v) =>
          editing
            ? update.mutateAsync({ id: editing.id, patch: v })
            : create.mutateAsync(v)
        }
      />

      {manageTeam && (
        <ManageSquadDialog
          open={!!manageTeam}
          onOpenChange={(o) => {
            if (!o) setManageTeam(null);
          }}
          teamId={manageTeam.id}
          teamName={manageTeam.name}
        />
      )}
    </>
  );
}