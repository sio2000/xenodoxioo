/**
 * Client-only build config. Use for production/Docker builds.
 * No server import - avoids "Could not resolve ./server" in esbuild.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: process.env.VITE_BASE_URL || "/",
  // Netlify often sets NEXT_PUBLIC_SUPABASE_* — expose to client bundle alongside VITE_*
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  build: {
    outDir: "dist/spa",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react']
        }
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
