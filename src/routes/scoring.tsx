import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/site/Stub";
export const Route = createFileRoute("/scoring")({
  component: () => <Stub title="Live Scoring" note="Live scoring engine, ball-by-ball input, Supabase Realtime sync and offline buffer are scheduled for Phase 3." />,
});
