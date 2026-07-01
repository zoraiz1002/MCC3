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

async function compressImage(file: File, maxWidth = 900, quality = 0.75): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const image = new Image();
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = url;
  });

  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export function EntityDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  submitLabel = "Save",
  extra,
}: Props) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    const init: Record<string, any> = {};
    const previewInit: Record<string, string> = {};

    for (const f of fields) {
      const v = initial?.[f.name];

      if (f.type === "datetime-local" && v) {
        init[f.name] = new Date(v).toISOString().slice(0, 16);
      } else {
        init[f.name] = v ?? (f.type === "boolean" ? false : "");
      }

      if (f.type === "file" && v) {
        previewInit[f.name] = v;
      }
    }

    setValues(init);
    setFiles({});
    setPreviews(previewInit);
  }, [open, initial, fields]);

  const set = (k: string, v: any) => {
    setValues((s) => ({ ...s, [k]: v }));
  };

  const chooseFile = (fieldName: string, file?: File | null) => {
    if (!file) return;

    setFiles((s) => ({ ...s, [fieldName]: file }));
    setPreviews((s) => ({ ...s, [fieldName]: URL.createObjectURL(file) }));
  };

  const removeFile = (fieldName: string) => {
    setFiles((s) => ({ ...s, [fieldName]: null }));
    setPreviews((s) => ({ ...s, [fieldName]: "" }));
    set(fieldName, null);
  };

  const uploadFile = async (field: Field, file: File) => {
    if (!field.bucket) throw new Error(`Missing bucket for ${field.name}`);

    const compressed = await compressImage(file);
    const ext = compressed.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(field.bucket)
      .upload(path, compressed, {
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
                <Select value={values[f.name] ?? ""} onValueChange={(v) => set(f.name, v)}>
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
                <div
                  className="rounded-lg border border-dashed p-4 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    chooseFile(f.name, e.dataTransfer.files?.[0]);
                  }}
                >
                  {previews[f.name] ? (
                    <div className="space-y-3">
                      <img
                        src={previews[f.name]}
                        alt={f.label}
                        className="mx-auto h-24 w-24 rounded object-cover border"
                      />
                      <div className="flex justify-center gap-2">
                        <Label className="cursor-pointer rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => chooseFile(f.name, e.target.files?.[0])}
                          />
                        </Label>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeFile(f.name)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Label className="cursor-pointer block">
                      <div className="text-sm text-muted-foreground">
                        Drag & drop image here, or click to upload
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => chooseFile(f.name, e.target.files?.[0])}
                      />
                    </Label>
                  )}
                </div>
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