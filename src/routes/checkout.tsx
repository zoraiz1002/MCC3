import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/site/Stub";
export const Route = createFileRoute("/checkout")({ component: () => <Stub title="Checkout" /> });
