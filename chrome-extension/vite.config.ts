import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      // Les deux HTML sont maintenant à la racine pour simplifier le chemin
      // dans le manifest (popup.html / offscreen.html au lieu de src/...).
      input: {
        popup: "popup.html",
        offscreen: "offscreen.html",
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },
});
