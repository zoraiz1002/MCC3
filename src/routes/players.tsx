import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePlayers } from "@/hooks/use-data";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/players")({ component: Players });

function Players() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = usePlayers();
  const list = (data ?? []).filter((p: any) => p.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageShell>
      <PageHero title="Players" subtitle="Meet the squad." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players..." className="max-w-md" />
        <div className="mt-8">
          {isLoading && <CardGridSkeleton count={8} />}
          {error && <ErrorState error={error} />}
          {!isLoading && !error && list.length === 0 && <EmptyState title="No players yet" hint="Players will appear here once added." />}
          {!isLoading && !error && list.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((p: any) => {
                const team = p.team_players?.[0]?.teams;
                return (
                  <Card key={p.id} className="p-5 text-center transition-all hover:-translate-y-1 hover:border-secondary glow-yellow">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-secondary to-yellow-600 font-display text-2xl">
                      {p.photo_url
                        ? <img src={p.photo_url} alt={p.full_name} className="h-full w-full object-cover" loading="lazy" />
                        : p.full_name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                    </div>
                    <div className="mt-3 font-semibold">{p.full_name}</div>
                    <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs">{p.role || "Player"}</span>
                    {team && <div className="mt-2 text-xs text-muted-foreground">{team.name}</div>}
                    <Link to="/players/$id" params={{ id: p.id }} className="mt-3 block">
                      <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
