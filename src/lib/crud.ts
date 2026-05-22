import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase } from "./supabase";

export function useList<T = any>(table: string, options?: { select?: string; order?: { column: string; ascending?: boolean }; key?: any[] }) {
  return useQuery({
    queryKey: [table, "list", options?.key],
    queryFn: async () => {
      let q = supabase.from(table).select(options?.select ?? "*");
      if (options?.order) q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useCrud(table: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [table] });

  const create = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { invalidate(); toast.success("Created"); },
    onError: (e: any) => toast.error(e.message ?? "Create failed"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { invalidate(); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  return { create, update, remove };
}
