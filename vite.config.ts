import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  if (mode === "production") {
    // Fail the build rather than ship a bundle that is wired to a developer shortcut or to localhost.
    const env = loadEnv(mode, process.cwd(), "VITE_");
    if (env.VITE_DEV_USER) {
      throw new Error("VITE_DEV_USER must not be set for a production build (it is a local development shortcut).");
    }
    if (!/^https:\/\/[^/\s]+$/.test(env.VITE_API_BASE_URL ?? "")) {
      throw new Error("VITE_API_BASE_URL must be the https:// address of the API, with no trailing slash.");
    }
  }
  return {
    plugins: [react()],
    server: { port: 5173 },
    build: { sourcemap: false }, // no source maps in production: they would publish the original source
  };
});
