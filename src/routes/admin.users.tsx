import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CrudTable } from "@/components/admin/CrudTable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/users")({ component: Page });

type Row = { id: string; full_name: string | null; phone: string | null; avatar_url: string | null; roles: string[]; created_at?: string };

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,avatar_url,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (pe) throw pe; if (re) throw re;
      const byUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => { (byUser[r.user_id] ??= []).push(r.role); });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.id] ?? [] })) as Row[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role, on }: { userId: string; role: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const RoleBtn = ({ row, role }: { row: Row; role: string }) => {
    const has = row.roles.includes(role);
    return (
      <Button size="sm" variant={has ? "default" : "outline"} onClick={() => setRole.mutate({ userId: row.id, role, on: !has })}>
        {role}
      </Button>
    );
  };

  return (
    <CrudTable<Row>
      title="Users" rows={data ?? []} loading={isLoading}
      searchKeys={["full_name", "phone"]}
      columns={[
        { key: "full_name", header: "Name", render: (r) => r.full_name ?? "—" },
        { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
        { key: "roles", header: "Roles", render: (r) => (
          <div className="flex gap-1">
            <RoleBtn row={r} role="admin" />
            <RoleBtn row={r} role="captain" />
            <RoleBtn row={r} role="player" />
          </div>
        )},
        { key: "created_at", header: "Joined", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
      ]}
    />
  );
}
