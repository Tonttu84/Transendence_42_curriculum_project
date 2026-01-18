import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/users": "http://localhost:3003",
      "/api/game": "http://localhost:3001",
      "/api/tournament": "http://localhost:3001",
    },
  },
  plugins: [react(), tailwindcss()],
});
