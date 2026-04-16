
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAppCache } from "./utils/cacheCleanup";

// Nettoyer le cache au démarrage
clearAppCache();

// Initialisation Capacitor (iOS / Android uniquement)
async function initNative() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform(); // "android" | "ios"

  // ── SplashScreen ──────────────────────────────────────────────────────────
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn("[Native] SplashScreen:", e);
  }

  // ── StatusBar ─────────────────────────────────────────────────────────────
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Default });
    if (platform === "android") {
      await StatusBar.setBackgroundColor({ color: "#10b981" });
    }
  } catch (e) {
    console.warn("[Native] StatusBar:", e);
  }

  // ── Android back button ──────────────────────────────────────────────────
  if (platform === "android") {
    try {
      const { App: CapApp } = await import("@capacitor/app");
      CapApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    } catch (e) {
      console.warn("[Native] App backButton:", e);
    }
  }

  // ── App state change (pause / resume) ────────────────────────────────────
  try {
    const { App: CapApp } = await import("@capacitor/app");
    CapApp.addListener("appStateChange", ({ isActive }) => {
      console.log("[Native] App state:", isActive ? "active" : "background");
    });
  } catch (e) {
    console.warn("[Native] AppStateChange:", e);
  }
}

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

// Lance l'initialisation native (fire & forget — n'attend pas)
initNative().catch(console.error);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
