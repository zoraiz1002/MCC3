import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({ component: Contact });

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  subject: z.string().min(2).max(100),
  message: z.string().min(10).max(1000),
});
type Form = z.infer<typeof schema>;

function Contact() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Form) => {
    if (!isSupabaseConfigured) {
      toast.success("Message captured (preview mode — connect Supabase to persist).");
      reset(); return;
    }
    const { error } = await supabase.from("contact_messages").insert({
      name: v.name, email: v.email, phone: v.phone || null, subject: v.subject, message: v.message,
    });
    if (error) toast.error(error.message); else { toast.success("Message sent!"); reset(); }
  };

  return (
    <PageShell>
      <PageHero title="Get In Touch" subtitle="Questions, trials, sponsorships — we'd love to hear from you." />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4">
          {[
            { Icon: MapPin, t: "Address", v: "Lahnaue Ground, Marburg, Hesse" },
            { Icon: Mail, t: "Email", v: "hello@marburgcc.de" },
            { Icon: Phone, t: "Phone", v: "+49 6421 000 0000" },
            { Icon: MessageCircle, t: "WhatsApp", v: "+49 151 0000 0000" },
          ].map(({Icon, t, v}) => (
            <Card key={t} className="flex items-start gap-4 p-5">
              <div className="rounded-xl bg-secondary/15 p-3"><Icon className="h-5 w-5 text-secondary" /></div>
              <div><div className="font-semibold">{t}</div><div className="text-sm text-muted-foreground">{v}</div></div>
            </Card>
          ))}
        </div>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-display text-3xl">Send a message</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}><Input {...register("name")} /></Field>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
            <Field label="Phone (optional)" error={errors.phone?.message}><Input {...register("phone")} /></Field>
            <Field label="Subject" error={errors.subject?.message}><Input {...register("subject")} /></Field>
            <div className="sm:col-span-2">
              <Field label="Message" error={errors.message?.message}>
                <Textarea rows={5} {...register("message")} />
              </Field>
            </div>
            <Button type="submit" disabled={isSubmitting} className="sm:col-span-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <iframe
          title="Marburg map"
          className="h-96 w-full rounded-2xl border border-border"
          src="https://www.openstreetmap.org/export/embed.html?bbox=8.74%2C50.79%2C8.81%2C50.83&layer=mapnik"
        />
      </section>
    </PageShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
