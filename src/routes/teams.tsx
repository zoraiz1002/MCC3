import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTeams } from "@/hooks/use-data";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/teams")({ component: Teams });

function Teams() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useTeams();
  const list = (data ?? []).filter((t: any) => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageShell>
      <PageHero title="Our Teams" subtitle="Squads competing across Hesse." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams..." className="max-w-md" />
        <div className="mt-8">
          {isLoading && <CardGridSkeleton />}
          {error && <ErrorState error={error} />}
          {!isLoading && !error && list.length === 0 && <EmptyState title="No teams yet" hint="Teams will appear here once added by an admin." />}
          {!isLoading && !error && list.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t: any) => (
                <Card key={t.id} className="overflow-hidden">
                  <div className="hero-gradient flex items-center justify-center py-10 text-white">
                    {t.badge_url
                      ? <img src={t.badge_url} alt={t.name} className="h-20 w-20 rounded-full object-cover" loading="lazy" />
                      : <span className="font-display text-6xl text-secondary">{(t.short_name || t.name).slice(0,2).toUpperCase()}</span>}
                  </div>
                  <div className="p-5">
                    <div className="text-xs font-semibold text-muted-foreground">{t.category}</div>
                    <div className="font-display text-2xl">{t.name}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t.captain?.full_name && <>Captain: <span className="text-foreground">{t.captain.full_name}</span><br/></>}
                      {(t.team_players?.length ?? 0)} players
                    </div>
                    <Link to="/teams/$id" params={{ id: t.id }} className="mt-4 block">
                      <Button className="w-full">View Team</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
