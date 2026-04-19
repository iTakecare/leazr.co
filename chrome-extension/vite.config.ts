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
      // Deux HTML à bundler :
      //  - popup : référencé par manifest.action.default_popup
      //  - offscreen : créé dynamiquement via chrome.offscreen.createDocument()
      // On doit déclarer les deux explicitement ici pour que Vite les émette.
      input: {
        popup: "src/popup/index.html",
        offscreen: "src/offscreen/offscreen.html",
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
