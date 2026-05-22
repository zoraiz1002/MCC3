import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/site/Stub";
export const Route = createFileRoute("/account/orders")({ component: () => <Stub title="My Orders" /> });
