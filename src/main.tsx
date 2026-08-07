
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAppCache } from "./utils/cacheCleanup";

// Nettoyer le cache au démarrage
clearAppCache();


// Prevent Vite HMR WebSocket errors from causing blank screens
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.toString?.()?.includes("insecure") ||
    event.reason?.stack?.includes("@vite/client")
  ) {
    console.warn("Suppressed Vite HMR WebSocket error:", event.reason);
    event.preventDefault();
  }
});

// Après un déploiement, les fenêtres restées ouvertes référencent des chunks
// dont le hash n'existe plus → l'import dynamique échoue. On recharge une fois
// pour récupérer le nouveau build au lieu d'afficher l'écran d'erreur.
window.addEventListener("vite:preloadError", (event) => {
  const key = "leazr-preload-error-reload";
  const last = Number(sessionStorage.getItem(key) || 0);
  // Au plus un reload auto toutes les 30 s — si le chunk manque durablement,
  // on laisse l'erreur remonter à l'ErrorBoundary plutôt que de boucler.
  if (Date.now() - last > 30_000) {
    sessionStorage.setItem(key, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
