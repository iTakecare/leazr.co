import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // En mode "native" (build pour Capacitor), les chemins doivent être
  // relatifs (./) pour que le WebView natif charge les assets correctement.
  base: mode === "native" ? "./" : "/",

  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 / rolldown : advancedChunks remplace manualChunks (forme objet).
        advancedChunks: {
          groups: [
            // React core
            { name: "vendor-react", test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
            // UI libraries
            { name: "vendor-ui", test: /node_modules[\\/](@radix-ui[\\/]react-(dialog|dropdown-menu|select|tabs|toast)|framer-motion)[\\/]/ },
            // Data fetching & forms
            { name: "vendor-data", test: /node_modules[\\/](@tanstack[\\/]react-query|react-hook-form|zod)[\\/]/ },
            // Supabase
            { name: "vendor-supabase", test: /node_modules[\\/]@supabase[\\/]/ },
            // PDF libraries (chargées uniquement quand nécessaire)
            { name: "vendor-pdf", test: /node_modules[\\/](jspdf|jspdf-autotable|pdf-lib)[\\/]/ },
            // Charts
            { name: "vendor-charts", test: /node_modules[\\/]recharts[\\/]/ },
            // Excel
            { name: "vendor-excel", test: /node_modules[\\/](exceljs|xlsx)[\\/]/ },
          ],
        },
      },
    },
  },
}));
