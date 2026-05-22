import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTournaments } from "@/hooks/use-data";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/tournaments")({ component: Tournaments });

function Tournaments() {
  const { data, isLoading, error } = useTournaments();
  return (
    <PageShell>
      <PageHero title="Tournaments" subtitle="Active, upcoming, and completed competitions." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <CardGridSkeleton count={4} />}
        {error && <ErrorState error={error} />}
        {!isLoading && !error && (data ?? []).length === 0 && <EmptyState title="No tournaments yet" />}
        {!isLoading && !error && (data ?? []).length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {(data ?? []).map((t: any) => (
              <Card key={t.id} className="overflow-hidden">
                <div className="hero-gradient h-40 px-6 py-5 text-white">
                  <div className="flex gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      t.status === "active" || t.status === "live" ? "bg-secondary text-secondary-foreground"
                      : t.status === "upcoming" ? "bg-white/20" : "bg-white/10"
                    }`}>{(t.status ?? "upcoming").toUpperCase()}</span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{t.format}</span>
                  </div>
                  <div className="mt-6 font-display text-3xl">{t.name}</div>
                  <div className="text-sm text-white/70">
                    {t.start_date && new Date(t.start_date).toLocaleDateString()} {t.end_date && `— ${new Date(t.end_date).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center justify-between p-5">
                  <span className="text-sm text-muted-foreground">{t.venue || "TBD"}</span>
                  <Link to="/tournaments/$id" params={{ id: t.id }}><Button>View Tournament</Button></Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
