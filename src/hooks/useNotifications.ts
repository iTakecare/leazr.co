import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface NotificationSettings {
  soundEnabled: boolean;
  browserNotifications: boolean;
  volume: number;
}

interface NotificationHook {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  playSound: (type: 'message' | 'visitor' | 'alert') => void;
  showNotification: (title: string, body: string, icon?: string) => void;
  showToast: (title: string, description?: string, variant?: 'default' | 'destructive') => void;
  requestPermission: () => Promise<boolean>;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const SOUND_URLS = {
  message: '/sounds/message.mp3', // You'll need to add these files
  visitor: '/sounds/visitor.mp3',
  alert: '/sounds/alert.mp3'
};

export const useNotifications = (): NotificationHook => {
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    browserNotifications: true,
    volume: 0.8
  });
  
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Initialize audio elements
  useEffect(() => {
    Object.entries(SOUND_URLS).forEach(([type, url]) => {
      const audio = new Audio(url);
      audio.volume = settings.volume;
      audioRefs.current[type] = audio;
    });

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('chat-notifications');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  }, []);

  // Update volume when settings change
  useEffect(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = settings.volume;
    });

    // Save settings to localStorage
    localStorage.setItem('chat-notifications', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const playSound = useCallback((type: 'message' | 'visitor' | 'alert') => {
    if (!settings.soundEnabled) return;

    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0; // Reset to start
      audio.play().catch(error => {
        console.error('Error playing sound:', error);
      });
    }
  }, [settings.soundEnabled]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback(async (title: string, body: string, icon?: string) => {
    if (!settings.browserNotifications) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/logo.png',
        badge: '/logo.png',
        tag: 'chat-notification',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [settings.browserNotifications, requestPermission]);

  const showToast = useCallback((title: string, description?: string, variant: 'default' | 'destructive' = 'default') => {
    toast({
      title,
      description,
      variant,
      duration: 5000
    });
  }, []);

  return {
    settings,
    updateSettings,
    playSound,
    showNotification,
    showToast,
    requestPermission,
    unreadCount,
    setUnreadCount
  };
};