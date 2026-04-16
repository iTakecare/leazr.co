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
      style: "DEFAULT",
      backgroundColor: "#10b981",
      overlaysWebView: false,
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
    contentInset: "automatic",
    scrollEnabled: true,
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
