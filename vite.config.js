import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Production builds drop debug logging (it printed API responses, including
  // auth tokens, to the browser console). console.error/warn are kept.
  esbuild:
    mode === "production"
      ? { pure: ["console.log", "console.debug", "console.info"] }
      : undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));