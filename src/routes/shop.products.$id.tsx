import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/site/Stub";
export const Route = createFileRoute("/shop/products/$id")({ component: () => <Stub title="Product Details" /> });
