import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/site/Stub";
export const Route = createFileRoute("/cart")({ component: () => <Stub title="Your Cart" /> });
