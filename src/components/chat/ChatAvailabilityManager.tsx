import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityHour {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' }
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` }
  ];
}).flat();

interface ChatAvailabilityManagerProps {
  className?: string;
}

export const ChatAvailabilityManager: React.FC<ChatAvailabilityManagerProps> = ({ 
  className = '' 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availabilityHours, setAvailabilityHours] = useState<AvailabilityHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');

  // Get company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
      }
    };

    fetchCompanyId();
  }, [user?.id]);

  // Load availability hours
  useEffect(() => {
    const loadAvailabilityHours = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from('chat_availability_hours')
          .select('*')
          .eq('company_id', companyId)
          .order('day_of_week')
          .order('start_time');

        if (error) {
          throw error;
        }

        // Normaliser le format des heures (HH:MM:SS -> HH:MM)
        const normalizedData = (data || []).map(hour => ({
          ...hour,
          start_time: hour.start_time?.substring(0, 5) || hour.start_time,
          end_time: hour.end_time?.substring(0, 5) || hour.end_time
        }));

        setAvailabilityHours(normalizedData);
      } catch (error) {
        console.error('Error loading availability hours:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les horaires de disponibilité",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailabilityHours();
  }, [companyId, toast]);

  const addAvailabilityHour = () => {
    const newHour: AvailabilityHour = {
      id: crypto.randomUUID(),
      day_of_week: 1,
      start_time: '09:00',
      end_time: '18:00',
      is_active: true
    };
    setAvailabilityHours(prev => [...prev, newHour]);
  };

  const updateAvailabilityHour = (id: string, field: keyof AvailabilityHour, value: any) => {
    setAvailabilityHours(prev => 
      prev.map(hour => 
        hour.id === id ? { ...hour, [field]: value } : hour
      )
    );
  };

  const removeAvailabilityHour = (id: string) => {
    setAvailabilityHours(prev => prev.filter(hour => hour.id !== id));
  };

  const saveAvailabilityHours = async () => {
    if (!companyId) return;

    setIsSaving(true);
    try {
      // Delete all existing hours for this company
      await supabase
        .from('chat_availability_hours')
        .delete()
        .eq('company_id', companyId);

      // Insert new hours
      const hoursToInsert = availabilityHours.map(hour => ({
        company_id: companyId,
        day_of_week: hour.day_of_week,
        start_time: hour.start_time,
        end_time: hour.end_time,
        is_active: hour.is_active
      }));

      if (hoursToInsert.length > 0) {
        const { error } = await supabase
          .from('chat_availability_hours')
          .insert(hoursToInsert);

        if (error) {
          throw error;
        }
      }

      toast({
        title: "Succès",
        description: "Horaires de disponibilité sauvegardés"
      });
    } catch (error) {
      console.error('Error saving availability hours:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les horaires",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Horaires de Disponibilité Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">
            Statut actuel du chat :
          </div>
          <Badge variant="secondary">
            Configuré - {availabilityHours.filter(h => h.is_active).length} créneaux actifs
          </Badge>
        </div>

        <Separator />

        {/* Availability Hours List */}
        <div className="space-y-3">
          {availabilityHours.map((hour) => (
            <div key={hour.id} className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                <Select
                  value={hour.day_of_week.toString()}
                  onValueChange={(value) => updateAvailabilityHour(hour.id, 'day_of_week', parseInt(value))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={hour.start_time}
                  onValueChange={(value) => updateAvailabilityHour(hour.id, 'start_time', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={hour.end_time}
                  onValueChange={(value) => updateAvailabilityHour(hour.id, 'end_time', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Switch
                  checked={hour.is_active}
                  onCheckedChange={(checked) => updateAvailabilityHour(hour.id, 'is_active', checked)}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAvailabilityHour(hour.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {availabilityHours.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun horaire configuré</p>
              <p className="text-xs">Le chat sera disponible 24h/24 sans restriction</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addAvailabilityHour}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un créneau
          </Button>
          
          <Button
            onClick={saveAvailabilityHours}
            disabled={isSaving}
            size="sm"
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          💡 Les visiteurs pourront démarrer une conversation même en dehors des heures d'ouverture, 
          mais leur message sera mis en file d'attente jusqu'à ce qu'un agent soit disponible.
        </div>
      </CardContent>
    </Card>
  );
};