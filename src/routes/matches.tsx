import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMatches } from "@/hooks/use-data";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/matches")({ component: Matches });

function badgeCls(s?: string) {
  return s === "live" ? "bg-destructive text-destructive-foreground animate-pulse"
    : s === "scheduled" ? "bg-secondary text-secondary-foreground"
    : "bg-muted text-foreground";
}

function Matches() {
  const { data, isLoading, error } = useMatches();
  return (
    <PageShell>
      <PageHero title="Matches" subtitle="Fixtures, live games, and results." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={4} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !error && (data ?? []).length === 0 && <EmptyState title="No matches yet" />}
        {!isLoading && !error && (data ?? []).length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {(data ?? []).map((m: any) => (
              <Card key={m.id} className="p-6 transition-all hover:border-secondary">
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badgeCls(m.status)}`}>
                    {m.status === "live" && "🔴 "}{(m.status ?? "").toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.match_date && new Date(m.match_date).toLocaleString()}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="font-display text-xl">{m.a?.name || m.a?.short_name || "Team A"}</div>
                  <div className="text-muted-foreground">vs</div>
                  <div className="font-display text-xl">{m.b?.name || m.b?.short_name || "Team B"}</div>
                </div>
                {(m.score_a || m.score_b) && (
                  <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{m.score_a} · {m.score_b}</div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">📍 {m.venue || "TBD"}</span>
                  <Link to="/matches/$id" params={{ id: m.id }}><Button size="sm" variant="outline">Details</Button></Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
