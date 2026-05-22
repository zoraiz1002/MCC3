import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { useCrud, useList } from "@/lib/crud";

export const Route = createFileRoute("/admin/notifications")({ component: Page });

const fields: Field[] = [
  { name: "title", label: "Title", required: true },
  { name: "message", label: "Message", type: "textarea", required: true },
  { name: "type", label: "Type", type: "select", options: [
    { value: "info", label: "Info" }, { value: "warning", label: "Warning" }, { value: "match", label: "Match" }, { value: "announcement", label: "Announcement" },
  ]},
  { name: "scheduled_at", label: "Schedule for", type: "datetime-local" },
];

function Page() {
  const { data, isLoading } = useList<any>("notifications", { order: { column: "created_at", ascending: false } });
  const { create, update, remove } = useCrud("notifications");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <>
      <CrudTable
        title="Notifications" rows={data ?? []} loading={isLoading}
        searchKeys={["title", "message"]}
        addLabel="New notification"
        columns={[
          { key: "title", header: "Title" },
          { key: "type", header: "Type" },
          { key: "scheduled_at", header: "Scheduled", render: (r) => r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : "—" },
          { key: "sent_at", header: "Sent", render: (r) => r.sent_at ? new Date(r.sent_at).toLocaleString() : "—" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => remove.mutate(r.id)}
      />
      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Edit notification" : "New notification"}
        fields={fields} initial={editing}
        onSubmit={(v) => {
          if (v.scheduled_at) v.scheduled_at = new Date(v.scheduled_at).toISOString();
          return editing ? update.mutateAsync({ id: editing.id, patch: v }) : create.mutateAsync(v);
        }}
      />
    </>
  );
}
