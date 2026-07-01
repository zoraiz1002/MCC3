import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "textarea" | "select" | "boolean" | "file";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  bucket?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: Field[];
  initial?: Record<string, any> | null;
  onSubmit: (values: Record<string, any>) => Promise<any> | any;
  submitLabel?: string;
  extra?: ReactNode;
}

export function EntityDialog({ open, onOpenChange, title, fields, initial, onSubmit, submitLabel = "Save", extra }: Props) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    const init: Record<string, any> = {};

    for (const f of fields) {
      const v = initial?.[f.name];

      if (f.type === "datetime-local" && v) {
        init[f.name] = new Date(v).toISOString().slice(0, 16);
      } else {
        init[f.name] = v ?? (f.type === "boolean" ? false : "");
      }
    }

    setValues(init);
    setFiles({});
  }, [open, initial, fields]);

  const set = (k: string, v: any) => {
    setValues((s) => ({ ...s, [k]: v }));
  };

  const uploadFile = async (field: Field, file: File) => {
    if (!field.bucket) {
      throw new Error(`Missing bucket for ${field.name}`);
    }

    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(field.bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(field.bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      const out: Record<string, any> = {};

      for (const f of fields) {
        let v = values[f.name];

        if (f.type === "file" && files[f.name]) {
          v = await uploadFile(f, files[f.name]!);
        }

        if (v === "" || v === undefined) v = null;
        if (f.type === "number" && v !== null) v = Number(v);

        out[f.name] = v;
      }

      await onSubmit(out);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>

              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              ) : f.type === "select" ? (
                <Select
                  value={values[f.name] ?? ""}
                  onValueChange={(v) => set(f.name, v)}
                >
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder={f.placeholder ?? "Select…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "boolean" ? (
                <input
                  id={f.name}
                  type="checkbox"
                  checked={!!values[f.name]}
                  onChange={(e) => set(f.name, e.target.checked)}
                  className="h-4 w-4"
                />
              ) : f.type === "file" ? (
                <>
                  <Input
                    id={f.name}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFiles((s) => ({
                        ...s,
                        [f.name]: e.target.files?.[0] ?? null,
                      }))
                    }
                  />

                  {values[f.name] && (
                    <img
                      src={values[f.name]}
                      alt={f.label}
                      className="mt-2 h-16 w-16 rounded border object-cover"
                    />
                  )}
                </>
              ) : (
                <Input
                  id={f.name}
                  type={f.type ?? "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}

          {extra}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}