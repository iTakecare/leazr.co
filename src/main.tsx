
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAppCache } from "./utils/cacheCleanup";

// Nettoyer le cache au démarrage
clearAppCache();

// Prevent Vite HMR WebSocket errors from causing blank screens
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.toString?.()?.includes('insecure') || 
      event.reason?.stack?.includes('@vite/client')) {
    console.warn('Suppressed Vite HMR WebSocket error:', event.reason);
    event.preventDefault();
  }
});

// Force TypeScript cache invalidation

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
