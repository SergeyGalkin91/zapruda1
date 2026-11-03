// Independent, upstream TanStack Start/Vite configuration for self-hosted ZAPRUDA.
// Keeps the existing custom SSR server entry (src/server.ts), Tailwind,
// TS path aliases, and Nitro output. Validate against CI before merging.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro(),
    react(),
  ],
});
