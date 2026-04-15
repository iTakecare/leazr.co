import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";

// VAPID public key (must match the private key set in Supabase secrets)
const VAPID_PUBLIC_KEY = "BPjaXneHAhDEVqvqo74JHWK3cmwdaZZgh9MrVsYTRzD8r8OOZn1RS5vbgIolwnM8GmYq6VffIBpuKLPGtv_WEmo";

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

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  isSupported: boolean;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Register service worker on mount
  useEffect(() => {
    if (!isSupported) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        setRegistration(reg);

        // Check current permission and subscription state
        setPermission(Notification.permission as PermissionState);
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch (err) {
        console.warn("[PWA] Service worker registration failed:", err);
      }
    };

    registerSW();
  }, [isSupported]);

  const saveSubscription = useCallback(
    async (sub: PushSubscription) => {
      if (!user?.id || !companyId) return;
      const subJson = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          company_id: companyId,
          endpoint: subJson.endpoint,
          subscription: subJson,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    [user, companyId]
  );

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration) return false;
    setIsLoading(true);
    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return false;

      // Subscribe to push
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setIsSubscribed(true);
      await saveSubscription(sub);
      return true;
    } catch (err) {
      console.error("[PWA] Push subscription failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registration, saveSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!registration) return;
    setIsLoading(true);
    try {
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Remove from DB
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
