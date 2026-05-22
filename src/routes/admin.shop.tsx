import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { useCrud, useList } from "@/lib/crud";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/shop")({ component: Page });

const productFields: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "slug", label: "Slug" },
  { name: "sku", label: "SKU" },
  { name: "price", label: "Price (€)", type: "number", required: true },
  { name: "sale_price", label: "Sale price (€)", type: "number" },
  { name: "stock", label: "Stock", type: "number" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "is_active", label: "Active", type: "boolean" },
];

function Products() {
  const { data, isLoading } = useList<any>("products", { order: { column: "created_at", ascending: false } });
  const { create, update, remove } = useCrud("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  return (
    <>
      <CrudTable
        title="Products" rows={data ?? []} loading={isLoading}
        searchKeys={["name", "sku"]}
        columns={[
          { key: "name", header: "Name" },
          { key: "sku", header: "SKU" },
          { key: "price", header: "Price", render: (r) => `€${Number(r.price).toFixed(2)}` },
          { key: "stock", header: "Stock" },
          { key: "is_active", header: "Active", render: (r) => r.is_active ? "Yes" : "No" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => remove.mutate(r.id)}
      />
      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Edit product" : "Add product"}
        fields={productFields} initial={editing}
        onSubmit={(v) => editing ? update.mutateAsync({ id: editing.id, patch: v }) : create.mutateAsync(v)}
      />
    </>
  );
}

function Orders() {
  const { data, isLoading } = useList<any>("orders", { order: { column: "created_at", ascending: false } });
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast.success("Order updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <CrudTable
      title="Orders" rows={data ?? []} loading={isLoading}
      searchKeys={["status", "payment_method"]}
      columns={[
        { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span> },
        { key: "total", header: "Total", render: (r) => `€${Number(r.total).toFixed(2)}` },
        { key: "status", header: "Status" },
        { key: "payment_status", header: "Payment" },
        { key: "created_at", header: "Date", render: (r) => new Date(r.created_at).toLocaleDateString() },
        { key: "actions", header: "Advance", render: (r) => {
          const next = ({ pending: "paid", paid: "shipped", shipped: "delivered" } as any)[r.status];
          return next ? <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: next })}>Mark {next}</Button> : "—";
        }},
      ]}
    />
  );
}

function Page() {
  return (
    <div>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><Products /></TabsContent>
        <TabsContent value="orders" className="mt-4"><Orders /></TabsContent>
      </Tabs>
      <Card className="mt-6 p-4 text-xs text-muted-foreground">
        Tip: Use the public <code>product-images</code> bucket for product photos. Variant management coming soon.
      </Card>
    </div>
  );
}
