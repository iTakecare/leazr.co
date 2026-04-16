/**
 * usePushNotifications
 *
 * Gestion unifiée des notifications push :
 *  • Sur navigateur web → Web Push (VAPID)
 *  • Sur iOS / Android (Capacitor) → FCM / APNs via @capacitor/push-notifications
 *
 * ⚠️  Pour les plateformes natives, un projet Firebase est requis :
 *     Android : google-services.json dans android/app/
 *     iOS     : GoogleService-Info.plist dans ios/App/App/
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";

// VAPID public key (doit correspondre à la clé privée dans les secrets Supabase)
const VAPID_PUBLIC_KEY =
  "BPjaXneHAhDEVqvqo74JHWK3cmwdaZZgh9MrVsYTRzD8r8OOZn1RS5vbgIolwnM8GmYq6VffIBpuKLPGtv_WEmo";

// Détection Capacitor (dynamique pour éviter les erreurs sur le web)
let _isNative = false;
let _platform = "web";
try {
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    _isNative = true;
    _platform = cap.getPlatform?.() ?? "native";
  }
} catch (_) {
  // pas de Capacitor, on reste sur web
}

export const isNativePlatform = _isNative;

// ── helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── types ─────────────────────────────────────────────────────────────────────

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  isSupported: boolean;
}

// ── hook ──────────────────────────────────────────────────────────────────────

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Web-only state ────────────────────────────────────────────────────────
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isWebPushSupported =
    !_isNative &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const isSupported = _isNative || isWebPushSupported;

  // ── Register service worker (web only) ───────────────────────────────────
  useEffect(() => {
    if (_isNative || !isWebPushSupported) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        setRegistration(reg);
        setPermission(Notification.permission as PermissionState);
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch (err) {
        console.warn("[PWA] Service worker registration failed:", err);
      }
    };

    registerSW();
  }, [isWebPushSupported]);

  // ── Native: check existing permission & token (Capacitor) ────────────────
  useEffect(() => {
    if (!_isNative) return;

    const checkNativePermission = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { receive } = await PushNotifications.checkPermissions();
        setPermission(receive === "granted" ? "granted" : receive === "denied" ? "denied" : "default");
        // If already granted, consider subscribed (token may have been saved before)
        setIsSubscribed(receive === "granted");
      } catch (e) {
        console.warn("[Native] PushNotifications.checkPermissions:", e);
        setPermission("unsupported");
      }
    };

    checkNativePermission();
  }, []);

  // ── Save subscription helpers ─────────────────────────────────────────────

  /** Web Push subscription → push_subscriptions table */
  const saveWebSubscription = useCallback(
    async (sub: PushSubscription) => {
      if (!user?.id || !companyId) return;
      const subJson = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          company_id: companyId,
          endpoint: subJson.endpoint,
          subscription: subJson,
          platform: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    [user, companyId]
  );

  /** Native FCM/APNs token → push_subscriptions table */
  const saveNativeToken = useCallback(
    async (token: string) => {
      if (!user?.id || !companyId) return;
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          company_id: companyId,
          endpoint: `native:${_platform}:${token}`,
          subscription: { token, platform: _platform },
          platform: _platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      console.log(`[Native] FCM token saved (${_platform})`);
    },
    [user, companyId]
  );

  // ── subscribe ─────────────────────────────────────────────────────────────

  const subscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    // ── Native (Capacitor) ────────────────────────────────────────────────
    if (_isNative) {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Request permission
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") {
          setPermission("denied");
          return false;
        }
        setPermission("granted");

        // Set up listeners before register()
        return await new Promise<boolean>((resolve) => {
          // Success: we receive the FCM token
          PushNotifications.addListener("registration", async (token) => {
            console.log("[Native] FCM token:", token.value);
            await saveNativeToken(token.value);
            setIsSubscribed(true);
            resolve(true);
          });

          // Error
          PushNotifications.addListener("registrationError", (err) => {
            console.error("[Native] Registration error:", err);
            resolve(false);
          });

          // Trigger registration
          PushNotifications.register().catch((e) => {
            console.error("[Native] Register failed:", e);
            resolve(false);
          });
        });
      } catch (e) {
        console.error("[Native] Push subscribe failed:", e);
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    // ── Web Push (VAPID) ──────────────────────────────────────────────────
    if (!isWebPushSupported || !registration) {
      setIsLoading(false);
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return false;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setIsSubscribed(true);
      await saveWebSubscription(sub);
      return true;
    } catch (err) {
      console.error("[PWA] Push subscription failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isWebPushSupported, registration, saveWebSubscription, saveNativeToken]);

  // ── unsubscribe ───────────────────────────────────────────────────────────

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      if (_isNative) {
        // On native, just remove from DB (no way to truly unregister from FCM client-side)
        if (user?.id) {
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        }
        setIsSubscribed(false);
        return;
      }

      // Web
      if (!registration) return;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        if (user?.id) {
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        }
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [registration, user]);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe, isSupported };
};
