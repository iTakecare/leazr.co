import React, { useState } from "react";
import { Bell, BellOff, Loader2, BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/context/AuthContext";
import { sendPushToUser } from "@/services/pushNotificationService";
import { toast } from "sonner";

export const PushNotificationToggle: React.FC = () => {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe, isSupported } = usePushNotifications();
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <BellOff className="h-4 w-4 text-slate-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-slate-600">Notifications push</p>
          <p className="text-xs text-slate-400">Non supporté par votre navigateur</p>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
        <BellOff className="h-4 w-4 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Notifications bloquées</p>
          <p className="text-xs text-red-500">Autorisez les notifications dans les paramètres de votre navigateur</p>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Notifications push désactivées");
    } else {
      const ok = await subscribe();
      if (ok) {
        toast.success("🔔 Notifications push activées ! Vous recevrez des alertes pour vos rappels.");
      } else if (permission === "denied") {
        toast.error("Permission refusée — activez les notifications dans votre navigateur");
      }
    }
  };

  const handleTest = async () => {
    if (!user?.id) return;
    setIsTesting(true);
    try {
      const result = await sendPushToUser(user.id, {
        title: "🔔 Test Leazr",
        body: "Les notifications push fonctionnent parfaitement !",
        url: "/",
        tag: "test-notification",
      });
      if (result.sent > 0) {
        toast.success("Notification test envoyée — vérifiez votre navigateur/appareil");
      } else {
        toast.error("Échec de l'envoi — vérifiez que les notifications sont bien autorisées");
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <BellRing className="h-4 w-4 text-emerald-600" />
            </div>
          ) : (
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Bell className="h-4 w-4 text-slate-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-800">Notifications push</p>
            <p className="text-xs text-slate-500">
              {isSubscribed
                ? "Activées — rappels et alertes en temps réel"
                : "Recevez des alertes pour vos rappels clients"}
            </p>
          </div>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
          className={
            isSubscribed
              ? "h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
              : "h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          }
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isSubscribed ? (
            "Désactiver"
          ) : (
            "Activer"
          )}
        </Button>
      </div>

      {/* Test button — only shown when subscribed */}
      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={isTesting}
          className="w-full h-8 text-xs text-slate-600 border-slate-200 gap-1.5"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Envoyer une notification test
        </Button>
      )}
    </div>
  );
};

export default PushNotificationToggle;
