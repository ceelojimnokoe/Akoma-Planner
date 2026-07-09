// Vitest configuration. We test plain TypeScript modules in src/lib
// (e.g. the budget calculator) without needing a real browser or Next.js
// server — jsdom is only pulled in for the rare component test.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
