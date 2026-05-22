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

export const Route = createFileRoute("/register")({ component: Register });

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  phone: z.string().max(30).optional().or(z.literal("")),
  role: z.enum(["player", "captain"]),
});
type Form = z.infer<typeof schema>;

function Register() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { role: "player" },
  });

  const onSubmit = async (v: Form) => {
    if (!isSupabaseConfigured) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase.auth.signUp({
      email: v.email, password: v.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: v.name, phone: v.phone, role: v.role },
      },
    });
    if (error) toast.error(error.message);
    else { toast.success("Account created — check your email."); nav({ to: "/verify-email" }); }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Join the club</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your player account.</p>
        <Card className="mt-6 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Full name" error={errors.name?.message}><Input {...register("name")}/></Field>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")}/></Field>
            <Field label="Phone (optional)" error={errors.phone?.message}><Input {...register("phone")}/></Field>
            <Field label="Password" error={errors.password?.message}><Input type="password" {...register("password")}/></Field>
            <Field label="Role" error={errors.role?.message}>
              <select {...register("role")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="player">Player</option>
                <option value="captain">Captain</option>
              </select>
            </Field>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-xs">
            Already a member? <Link to="/login" className="font-semibold hover:text-secondary">Sign in</Link>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </div>
  );
}
