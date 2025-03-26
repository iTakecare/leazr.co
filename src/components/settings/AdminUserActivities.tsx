
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, FileText, Send, Check, X, AlertCircle, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  entity_type: string;
  entity_id: string;
  details?: any;
}

interface AdminUserActivitiesProps {
  userId: string;
}

export const AdminUserActivities: React.FC<AdminUserActivitiesProps> = ({ userId }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les activités de l'utilisateur
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer les logs de workflow des offres
        const { data: offerLogs, error: offerError } = await supabase
          .from('offer_workflow_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (offerError) throw offerError;
        
        // Récupérer les logs de workflow des contrats
        const { data: contractLogs, error: contractError } = await supabase
          .from('contract_workflow_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (contractError) throw contractError;
        
        // Transformer les logs en format d'activité
        const offerActivities = offerLogs.map(log => ({
          id: log.id,
          timestamp: log.created_at,
          type: 'status_change',
          description: `Changement de statut d'offre: ${log.previous_status || 'nouveau'} → ${log.new_status}`,
          entity_type: 'offer',
          entity_id: log.offer_id,
          details: {
            previous_status: log.previous_status,
            new_status: log.new_status,
            reason: log.reason
          }
        }));
        
        const contractActivities = contractLogs.map(log => ({
          id: log.id,
          timestamp: log.created_at,
          type: 'status_change',
          description: `Changement de statut de contrat: ${log.previous_status || 'nouveau'} → ${log.new_status}`,
          entity_type: 'contract',
          entity_id: log.contract_id,
          details: {
            previous_status: log.previous_status,
            new_status: log.new_status,
            reason: log.reason
          }
        }));
        
        // Combiner et trier toutes les activités par date
        const allActivities = [...offerActivities, ...contractActivities];
        allActivities.sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        setActivities(allActivities);
      } catch (err: any) {
        console.error("Erreur lors du chargement des activités:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des activités");
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy à HH:mm", { locale: fr });
  };

  const getStatusBadgeColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'accepted': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'sent': 'bg-blue-100 text-blue-800',
      'signed': 'bg-purple-100 text-purple-800',
      'canceled': 'bg-gray-100 text-gray-800',
      'contract_sent': 'bg-blue-100 text-blue-800',
      'contract_signed': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'info_requested': 'bg-amber-100 text-amber-800',
      'in_progress': 'bg-indigo-100 text-indigo-800',
      'delivered': 'bg-teal-100 text-teal-800'
    };
    
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getActivityIcon = (activity: ActivityItem) => {
    const entityIcons: Record<string, React.ReactNode> = {
      'offer': <FileText className="h-5 w-5 text-blue-500" />,
      'contract': <FileText className="h-5 w-5 text-green-500" />
    };
    
    const statusIcons: Record<string, React.ReactNode> = {
      'accepted': <Check className="h-5 w-5 text-green-500" />,
      'rejected': <X className="h-5 w-5 text-red-500" />,
      'pending': <Clock className="h-5 w-5 text-amber-500" />,
      'info_requested': <AlertCircle className="h-5 w-5 text-amber-500" />,
      'sent': <Send className="h-5 w-5 text-blue-500" />
    };
    
    if (activity.type === 'status_change' && activity.details?.new_status && statusIcons[activity.details.new_status]) {
      return statusIcons[activity.details.new_status];
    }
    
    return entityIcons[activity.entity_type] || <Activity className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p>Erreur lors du chargement des activités: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune activité trouvée pour cet administrateur
          </div>
        ) : (
          activities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex items-start space-x-3">
                <div className="bg-muted rounded-full p-2">
                  {getActivityIcon(activity)}
                </div>
                <div className="space-y-1 flex-1">
                  <p className="font-medium">{activity.description}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </p>
                    {activity.details?.previous_status && (
                      <Badge variant="outline" className={getStatusBadgeColor(activity.details.previous_status)}>
                        {activity.details.previous_status}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">→</span>
                    {activity.details?.new_status && (
                      <Badge variant="outline" className={getStatusBadgeColor(activity.details.new_status)}>
                        {activity.details.new_status}
                      </Badge>
                    )}
                  </div>
                  {activity.details?.reason && (
                    <p className="text-sm italic">
                      Raison: {activity.details.reason}
                    </p>
                  )}
                </div>
              </div>
              {index < activities.length - 1 && <Separator className="my-4" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
