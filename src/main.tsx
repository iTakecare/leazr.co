
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/native.css";
import { clearAppCache } from "./utils/cacheCleanup";

// Nettoyer le cache au démarrage
clearAppCache();

// Initialisation Capacitor (iOS / Android uniquement)
async function initNative() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform(); // "android" | "ios"

  // ── Marqueurs CSS ─────────────────────────────────────────────────────────
  // Toute la couche native.css est verrouillée derrière `.native-app` : c'est
  // ici, et seulement ici, qu'elle s'active.
  document.documentElement.classList.add("native-app", `platform-${platform}`);

  // ── Verrouiller le zoom ───────────────────────────────────────────────────
  // Le pincer-zoomer sur une app trahit immédiatement la WebView. On le coupe
  // en natif uniquement — le site web garde son viewport accessible.
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
  );

  // ── Clavier ───────────────────────────────────────────────────────────────
  // Sans ça, le clavier masque les champs du bas sans que rien ne se décale.
  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
    await Keyboard.setAccessoryBarVisible({ isVisible: false });

    Keyboard.addListener("keyboardWillShow", (info) => {
      document.documentElement.style.setProperty(
        "--keyboard-height",
        `${info.keyboardHeight}px`
      );
      document.documentElement.classList.add("keyboard-open");
    });

    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--keyboard-height", "0px");
      document.documentElement.classList.remove("keyboard-open");
    });
  } catch (e) {
    console.warn("[Native] Keyboard:", e);
  }

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

// Lance l'initialisation native (fire & forget — n'attend pas)
initNative().catch(console.error);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
