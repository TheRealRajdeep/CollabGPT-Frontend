import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist'
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: ["localhost:5173","collabgpt-frontend-production-84cb.up.railway.app"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
