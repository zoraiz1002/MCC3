import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { PageShell } from "./PageShell";
import { Button } from "@/components/ui/button";

export function Stub({ title, note }: { title: string; note?: string }) {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/15">
          <Construction className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="mt-6 font-display text-5xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">
          {note ?? "This page is part of Phase 2 — the data model, queries, and UI will be wired to Supabase next. The route is live and reachable."}
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button>Back to home</Button>
        </Link>
      </div>
    </PageShell>
  );
}
