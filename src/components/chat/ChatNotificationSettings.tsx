import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Bell, Volume2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export const ChatNotificationSettings: React.FC = () => {
  const { settings, updateSettings, playSound, audioContextReady, activateAudio } = useNotifications();

  return (
    <Card className="border-0 shadow-lg bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Sons et Notifications
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Sons activés</label>
            <p className="text-xs text-muted-foreground">
              Jouer des sons pour les notifications
            </p>
            {settings.soundEnabled && (
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-2 h-2 rounded-full ${audioContextReady ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {audioContextReady ? 'Audio prêt' : 'Cliquez pour activer'}
                </span>
              </div>
            )}
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
          />
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Volume</label>
          <Slider
            value={[settings.volume * 100]}
            onValueChange={([value]) => updateSettings({ volume: value / 100 })}
            max={100}
            step={10}
            disabled={!settings.soundEnabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>{Math.round(settings.volume * 100)}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Browser Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Notifications navigateur</label>
            <p className="text-xs text-muted-foreground">
              Afficher les notifications système
            </p>
          </div>
          <Switch
            checked={settings.browserNotifications}
            onCheckedChange={(checked) => updateSettings({ browserNotifications: checked })}
          />
        </div>

        {/* Test Sound Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!audioContextReady) {
                const activated = await activateAudio();
                if (!activated) {
                  console.warn('Impossible d\'activer l\'audio');
                  return;
                }
              }
              playSound('message');
            }}
            disabled={!settings.soundEnabled}
            className="w-full"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Tester le son
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};