import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Trophy, CalendarDays, Activity, Bell, ShoppingBag, UserCog, BarChart3, MessageSquare, Settings } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { AdminGate } from "@/components/admin/AdminGate";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/players", label: "Players", icon: Users },
  { to: "/admin/teams", label: "Teams", icon: Users },
  { to: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/admin/matches", label: "Matches", icon: CalendarDays },
  { to: "/admin/scoring", label: "Scoring", icon: Activity },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/shop", label: "Shop", icon: ShoppingBag },
  { to: "/admin/users", label: "Users", icon: UserCog },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/communications", label: "Communications", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1 rounded-2xl bg-card p-3 border border-border">
            {items.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
                  }`}>
                  <it.icon className="h-4 w-4"/>{it.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <AdminGate><Outlet /></AdminGate>
        </main>
      </div>
    </div>
  );
}
