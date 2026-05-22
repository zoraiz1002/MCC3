import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/login")({ component: Login });

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type Form = z.infer<typeof schema>;

function Login() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Form) => {
    if (!isSupabaseConfigured) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase.auth.signInWithPassword(v);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back!"); nav({ to: "/dashboard" }); }
  };

  const google = async () => {
    if (!isSupabaseConfigured) { toast.error("Supabase not configured."); return; }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-4xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to the club.</p>
        <Card className="mt-6 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" {...register("email")} className="mt-1"/>
              {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input type="password" {...register("password")} className="mt-1"/>
              {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border"/>OR<span className="h-px flex-1 bg-border"/>
          </div>
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          <div className="mt-4 flex justify-between text-xs">
            <Link to="/forgot-password" className="hover:text-secondary">Forgot password?</Link>
            <Link to="/register" className="hover:text-secondary">Create account</Link>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
