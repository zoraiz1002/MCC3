import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export function AdminGate({ children }: { children: ReactNode }) {
  const { loading, user, isAdmin, configured } = useAuth();
  if (!configured) {
    return (
      <Card className="p-10 text-center">
        <h2 className="font-display text-2xl">Supabase not configured</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </Card>
    );
  }
  if (loading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <Card className="p-10 text-center">
        <h2 className="font-display text-2xl">Sign in required</h2>
        <p className="mt-2 text-sm text-muted-foreground">Admins only.</p>
        <Link to="/login" className="mt-4 inline-flex rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">Sign in</Link>
      </Card>
    );
  }
  if (!isAdmin) {
    return (
      <Card className="p-10 text-center">
        <h2 className="font-display text-2xl">Forbidden</h2>
        <p className="mt-2 text-sm text-muted-foreground">You need the <code>admin</code> role to access this area.</p>
      </Card>
    );
  }
  return <>{children}</>;
}
