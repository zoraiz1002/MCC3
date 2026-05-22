import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Users, Trophy, CalendarDays, Euro } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({ component: Overview });

function useCount(table: string) {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useRevenue() {
  return useQuery({
    queryKey: ["revenue", "mtd"],
    queryFn: async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from("orders").select("total,payment_status,created_at").gte("created_at", start.toISOString());
      if (error) throw error;
      return (data ?? []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    },
  });
}

function Overview() {
  const players = useCount("players");
  const teams = useCount("teams");
  const matches = useCount("matches");
  const revenue = useRevenue();

  const kpis = [
    { l: "Total Players", v: players.data ?? "—", Icon: Users },
    { l: "Active Teams", v: teams.data ?? "—", Icon: Trophy },
    { l: "Matches (total)", v: matches.data ?? "—", Icon: CalendarDays },
    { l: "Revenue (MTD)", v: `€${(revenue.data ?? 0).toFixed(2)}`, Icon: Euro },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl">Admin Overview</h1>
      <p className="text-sm text-muted-foreground">Welcome back. Here's the state of the club.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l} className="p-5">
            <k.Icon className="h-5 w-5 text-secondary" />
            <div className="mt-3 font-display text-3xl">{k.v}</div>
            <div className="text-xs text-muted-foreground">{k.l}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
