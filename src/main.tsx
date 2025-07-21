
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAppCache } from "./utils/cacheCleanup";

// Nettoyer le cache au démarrage
clearAppCache();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
