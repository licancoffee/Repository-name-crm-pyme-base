// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
//
// The Lovable config defaults Nitro to Cloudflare. On Vercel we must explicitly use the
// Vercel preset so the server bundle is emitted with Vercel-compatible bindings/output.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = Boolean(process.env.VERCEL);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },

  // In Vercel CI, VERCEL=1 is provided automatically.
  // Locally keep Nitro enabled so `npm run build` continues validating the server bundle.
  nitro: isVercel ? { preset: "vercel" } : true,
});
