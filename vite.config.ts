import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Pure SPA build for Vercel — no Cloudflare Worker, no SSR server entry.
// TanStack Start prerenders the shell to dist/index.html; routing is fully
// client-side via TanStack Router thereafter.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: { enabled: true },
  },
});
