import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API base URL is injected at build time via VITE_API_URL (set per environment).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  preview: { port: 5173, host: true },
});
