import { useState, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface Props<T extends { id: string }> {
  title: string;
  rows: T[];
  loading?: boolean;
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  searchKeys?: (keyof T)[];
  addLabel?: string;
  rightActions?: ReactNode;
}

export function CrudTable<T extends { id: string }>({ title, rows, loading, columns, onAdd, onEdit, onDelete, searchKeys, addLabel = "Add new", rightActions }: Props<T>) {
  const [q, setQ] = useState("");
  const filtered = q && searchKeys ? rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase()))) : rows;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{title}</h1>
        <div className="flex items-center gap-2">
          {searchKeys && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-48 pl-8" />
            </div>
          )}
          {rightActions}
          {onAdd && <Button onClick={onAdd}><Plus className="mr-1 h-4 w-4"/>{addLabel}</Button>}
        </div>
      </div>
      <Card className="mt-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => <TableHead key={c.key}>{c.header}</TableHead>)}
              {(onEdit || onDelete) && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="py-10 text-center text-sm text-muted-foreground">No records yet.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                {columns.map((c) => <TableCell key={c.key}>{c.render ? c.render(r) : String((r as any)[c.key] ?? "—")}</TableCell>)}
                {(onEdit || onDelete) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-4 w-4"/></Button>}
                      {onDelete && <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this record?")) onDelete(r); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
