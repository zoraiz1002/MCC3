import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({ component: Verify });

function Verify() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <MailCheck className="mx-auto h-14 w-14 text-secondary" />
        <h1 className="mt-4 font-display text-4xl">Check your email</h1>
        <p className="mt-2 text-muted-foreground">We've sent a confirmation link. Click it to activate your account.</p>
        <Link to="/login"><Button className="mt-6">Back to sign in</Button></Link>
      </div>
    </PageShell>
  );
}
