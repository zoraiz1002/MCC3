import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) { toast.error("Supabase not configured."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent — check your email.");
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Forgot password</h1>
        <Card className="mt-6 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required/>
            <Button type="submit" disabled={loading} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <Link to="/login" className="mt-4 block text-center text-xs hover:text-secondary">Back to sign in</Link>
        </Card>
      </div>
    </PageShell>
  );
}
