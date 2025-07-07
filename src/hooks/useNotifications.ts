import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { getSoundGenerator } from '@/utils/SoundGenerator';

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
  audioContextReady: boolean;
  activateAudio: () => Promise<boolean>;
}

export const useNotifications = (): NotificationHook => {
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    browserNotifications: true,
    volume: 0.8
  });
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [audioContextReady, setAudioContextReady] = useState(false);
  const soundGeneratorRef = useRef(getSoundGenerator());
  const activationAttempted = useRef(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chat-notifications');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
    
    // Auto-activate audio on any user interaction
    const activateOnInteraction = async () => {
      if (!activationAttempted.current) {
        activationAttempted.current = true;
        const success = await activateAudio();
        if (success) {
          console.log('🔊 Audio activé automatiquement');
        }
      }
    };

    // Listen for any user interaction
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, activateOnInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activateOnInteraction);
      });
    };
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chat-notifications', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const activateAudio = useCallback(async (): Promise<boolean> => {
    try {
      const success = await soundGeneratorRef.current.activate();
      setAudioContextReady(success);
      return success;
    } catch (error) {
      console.error('Error activating audio:', error);
      return false;
    }
  }, []);

  const playSound = useCallback(async (type: 'message' | 'visitor' | 'alert') => {
    if (!settings.soundEnabled) return;

    try {
      // Try to activate audio if not ready
      if (!audioContextReady) {
        console.log('🔊 Tentative d\'activation audio...');
        const activated = await activateAudio();
        if (!activated) {
          console.warn('⚠️ Impossible d\'activer l\'audio');
          return;
        }
      }

      await soundGeneratorRef.current.playSound(type, settings.volume);
      console.log('✅ Son joué avec succès:', type);
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du son:', error);
    }
  }, [settings.soundEnabled, settings.volume, audioContextReady, activateAudio]);

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
    setUnreadCount,
    audioContextReady,
    activateAudio
  };
};