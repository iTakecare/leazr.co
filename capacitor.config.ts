import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.leazr.app",
  appName: "Leazr",
  webDir: "dist",

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#10b981",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#10b981",
      // true : la WebView s'étend SOUS la barre d'état, et c'est le header de
      // l'app qui fournit le fond (il gère déjà env(safe-area-inset-top)).
      // À false, on voyait le fond vert du splash screen apparaître en haut —
      // le défaut le plus visible sur l'écran d'accueil.
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Requis pour que les assets Vite (chemin relatif ./) fonctionnent
    appendUserAgent: "LeazrApp/1.0 Android",
  },

  ios: {
    // "never" : les marges système sont gérées en CSS via env(safe-area-inset-*),
    // ce qui donne un contrôle exact plutôt que l'ajustement automatique WebKit.
    contentInset: "never",
    // Le point clé du rendu natif : la WebView elle-même ne défile plus, donc
    // plus de rebond élastique sur la page. Seuls les conteneurs .app-scroll
    // défilent, comme dans une application UIKit.
    scrollEnabled: false,
    appendUserAgent: "LeazrApp/1.0 iOS",
  },

  server: {
    // Utilise HTTPS scheme sur Android (évite les erreurs mixed-content)
    androidScheme: "https",
    // ↓ Décommentez et remplacez l'IP pour le live-reload en développement
    // url: "http://192.168.1.X:8080",
    // cleartext: true,
  },
};

export default config;
