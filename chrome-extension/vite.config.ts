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
      // Le popup est référencé via manifest.action.default_popup et géré
      // automatiquement par @crxjs/vite-plugin. On ne déclare ici QUE l'offscreen,
      // qui n'apparaît pas dans le manifest (créé dynamiquement par le SW).
      input: {
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
