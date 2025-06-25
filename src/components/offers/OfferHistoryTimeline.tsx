
import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  User, 
  Plus, 
  Edit, 
  ArrowRightLeft, 
  MessageSquare, 
  Mail, 
  MousePointer,
  Package,
  Trash2
} from "lucide-react";
import { Timeline, TimelineItem, TimelineItemContent, TimelineItemIndicator, TimelineItemTitle } from "@/components/ui/timeline";

interface OfferHistoryEvent {
  id: string;
  offer_id: string;
  event_type: 'created' | 'modified' | 'status_changed' | 'note_added' | 'equipment_added' | 'equipment_removed' | 'client_interaction' | 'email_sent';
  description: string;
  details?: Record<string, any>;
  user_id?: string;
  user_name?: string;
  created_at: string;
}

interface OfferHistoryTimelineProps {
  events: OfferHistoryEvent[];
  loading?: boolean;
}

const OfferHistoryTimeline: React.FC<OfferHistoryTimelineProps> = ({ events, loading = false }) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'modified':
        return <Edit className="h-4 w-4" />;
      case 'status_changed':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'note_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'equipment_added':
        return <Package className="h-4 w-4" />;
      case 'equipment_removed':
        return <Trash2 className="h-4 w-4" />;
      case 'client_interaction':
        return <MousePointer className="h-4 w-4" />;
      case 'email_sent':
        return <Mail className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-green-500';
      case 'modified':
        return 'bg-blue-500';
      case 'status_changed':
        return 'bg-purple-500';
      case 'note_added':
        return 'bg-yellow-500';
      case 'equipment_added':
        return 'bg-emerald-500';
      case 'equipment_removed':
        return 'bg-red-500';
      case 'client_interaction':
        return 'bg-orange-500';
      case 'email_sent':
        return 'bg-cyan-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'Création';
      case 'modified':
        return 'Modification';
      case 'status_changed':
        return 'Changement de statut';
      case 'note_added':
        return 'Note ajoutée';
      case 'equipment_added':
        return 'Équipement ajouté';
      case 'equipment_removed':
        return 'Équipement supprimé';
      case 'client_interaction':
        return 'Interaction client';
      case 'email_sent':
        return 'Email envoyé';
      default:
        return 'Événement';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique complet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement de l'historique...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique complet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Aucun événement trouvé dans l'historique.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique complet
          <Badge variant="secondary">{events.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto">
        <Timeline>
          {events.map((event) => (
            <TimelineItem key={event.id}>
              <TimelineItemIndicator 
                className={`${getEventColor(event.event_type)} text-white border-0`}
              >
                {getEventIcon(event.event_type)}
              </TimelineItemIndicator>
              <TimelineItemContent>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <TimelineItemTitle className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getEventTypeLabel(event.event_type)}
                      </Badge>
                    </TimelineItemTitle>
                    <p className="text-sm mt-1 text-foreground">
                      {event.description}
                    </p>
                    
                    {/* Détails supplémentaires */}
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded-md text-xs">
                        {Object.entries(event.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{event.user_name || 'Système'}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(event.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                    </div>
                  </div>
                </div>
              </TimelineItemContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};

export default OfferHistoryTimeline;
