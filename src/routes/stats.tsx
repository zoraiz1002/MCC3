import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/site/Loading";

export const Route = createFileRoute("/stats")({ component: Stats });

function Stats() {
  const { data: batters, isLoading: lb, error: eb } = useQuery({
    queryKey: ["top_batters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("player_stats").select("runs, players(full_name)").order("runs", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ name: r.players?.full_name ?? "—", runs: r.runs ?? 0 }));
    },
  });
  const { data: bowlers, isLoading: lw, error: ew } = useQuery({
    queryKey: ["top_bowlers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("player_stats").select("wickets, players(full_name)").order("wickets", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ name: r.players?.full_name ?? "—", wickets: r.wickets ?? 0 }));
    },
  });

  return (
    <PageShell>
      <PageHero title="Club Statistics" subtitle="Live numbers from every match." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-2xl">Top Run-Scorers</h2>
            {lb && <CardGridSkeleton count={1} />}
            {eb && <ErrorState error={eb} />}
            {!lb && !eb && (batters ?? []).length === 0 && <EmptyState title="No batting stats yet" />}
            {!lb && !eb && (batters ?? []).length > 0 && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={batters}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70}/>
                  <YAxis /><Tooltip /><Bar dataKey="runs" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-2xl">Top Wicket-Takers</h2>
            {lw && <CardGridSkeleton count={1} />}
            {ew && <ErrorState error={ew} />}
            {!lw && !ew && (bowlers ?? []).length === 0 && <EmptyState title="No bowling stats yet" />}
            {!lw && !ew && (bowlers ?? []).length > 0 && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={bowlers}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70}/>
                  <YAxis /><Tooltip /><Bar dataKey="wickets" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
