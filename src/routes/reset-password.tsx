import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({ component: Reset });

function Reset() {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) { toast.error("Supabase not configured."); return; }
    if (pwd.length < 6) { toast.error("Password must be at least 6 chars"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); nav({ to: "/login" }); }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Set new password</h1>
        <Card className="mt-6 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input type="password" placeholder="New password" value={pwd} onChange={(e) => setPwd(e.target.value)} required/>
            <Button type="submit" disabled={loading} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
