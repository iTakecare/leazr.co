import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const AdminNotificationBadge = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate to offer if available
    if (notification.offer_id) {
      navigate(`/admin/offers/${notification.offer_id}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                // Determine source badge
                const getSourceBadge = () => {
                  const metadata = notification.metadata as Record<string, any> | null;
                  if (notification.type === 'new_meta_lead' || metadata?.source === 'meta') {
                    const platform = metadata?.platform;
                    if (platform === 'fb') {
                      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">📘 Facebook</Badge>;
                    }
                    return <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300 text-xs">📸 Instagram</Badge>;
                  }
                  if (metadata?.source === 'site_web' || notification.type === 'new_offer') {
                    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">🌐 Site Web</Badge>;
                  }
                  return null;
                };
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                      !notification.is_read ? 'bg-accent/10 border-primary/20' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        {getSourceBadge()}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    {(notification.metadata as Record<string, any> | null)?.error && (
                      <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                        ⚠️ Erreur d'envoi d'email : {(notification.metadata as Record<string, any>).error}
                      </div>
                    )}
                    {(notification.metadata as Record<string, any> | null)?.email_error && (
                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                        ⚠️ Email non envoyé : {(notification.metadata as Record<string, any>).email_error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
