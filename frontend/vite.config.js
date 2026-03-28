import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass: (req) => {
          // Don't proxy /auth/callback — let React Router handle it
          if (req.url === "/auth/callback" || req.url.startsWith("/auth/callback?")) {
            return req.url;
          }
        },
      },
    },
  },
});
