
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FileCheck, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityFeedProps {
  activities: any[];
  isLoading?: boolean;
}

export const ActivityFeed = ({ activities, isLoading = false }: ActivityFeedProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Activité récente</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse mr-3"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities.length) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Activité récente</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <h3 className="text-lg font-medium">Aucune activité récente</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Les activités apparaîtront ici lorsqu'elles seront disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "client_waiting": { label: "En attente", variant: "outline" },
      "client_approved": { label: "Approuvé", variant: "default" },
      "client_no_response": { label: "Sans réponse", variant: "destructive" },
      "leaser_approved": { label: "Contrat signé", variant: "default" },
      "leaser_rejected": { label: "Rejeté", variant: "destructive" },
      "leaser_review": { label: "En revue", variant: "outline" },
    };
    
    return statusMap[status] || { label: status, variant: "secondary" };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Activité récente</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.map((activity) => {
            const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fr });
            const newStatusInfo = getStatusLabel(activity.new_status);
            
            return (
              <div key={activity.id} className="flex">
                <div className="mr-4 mt-0.5">
                  {activity.type === 'contract' ? (
                    <FileCheck className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-purple-500" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.profiles?.first_name} {activity.profiles?.last_name} a changé le statut
                  </p>
                  <div className="flex items-center pt-1">
                    <Badge variant="secondary" className="mr-1 text-xs">
                      {getStatusLabel(activity.previous_status).label}
                    </Badge>
                    <span className="text-xs mx-1">→</span>
                    <Badge variant={newStatusInfo.variant} className="text-xs">
                      {newStatusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo} • {activity.type === 'contract' ? 'Contrat' : 'Offre'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
