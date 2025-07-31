import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Edit, LogIn, LogOut, FileText, UserPlus, Settings, Shield } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ambassadorActivityService, AmbassadorActivityLog, ActivityTypes } from "@/services/ambassadorActivityService";

interface AmbassadorActivityHistoryProps {
  ambassadorId: string;
}

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case ActivityTypes.LOGIN:
      return <LogIn className="h-4 w-4" />;
    case ActivityTypes.LOGOUT:
      return <LogOut className="h-4 w-4" />;
    case ActivityTypes.PROFILE_UPDATE:
      return <Edit className="h-4 w-4" />;
    case ActivityTypes.OFFER_CREATED:
    case ActivityTypes.OFFER_UPDATED:
      return <FileText className="h-4 w-4" />;
    case ActivityTypes.CLIENT_ADDED:
    case ActivityTypes.CLIENT_UPDATED:
      return <UserPlus className="h-4 w-4" />;
    case ActivityTypes.COMMISSION_LEVEL_CHANGED:
      return <Settings className="h-4 w-4" />;
    case ActivityTypes.ACCOUNT_CREATED:
    case ActivityTypes.PASSWORD_CHANGED:
      return <Shield className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActivityColor = (actionType: string) => {
  switch (actionType) {
    case ActivityTypes.LOGIN:
      return "bg-green-500/10 text-green-700 border-green-200";
    case ActivityTypes.LOGOUT:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    case ActivityTypes.PROFILE_UPDATE:
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case ActivityTypes.OFFER_CREATED:
    case ActivityTypes.OFFER_UPDATED:
      return "bg-purple-500/10 text-purple-700 border-purple-200";
    case ActivityTypes.CLIENT_ADDED:
    case ActivityTypes.CLIENT_UPDATED:
      return "bg-orange-500/10 text-orange-700 border-orange-200";
    case ActivityTypes.COMMISSION_LEVEL_CHANGED:
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case ActivityTypes.ACCOUNT_CREATED:
    case ActivityTypes.PASSWORD_CHANGED:
      return "bg-red-500/10 text-red-700 border-red-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export const AmbassadorActivityHistory = ({ ambassadorId }: AmbassadorActivityHistoryProps) => {
  const [activities, setActivities] = useState<AmbassadorActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const data = await ambassadorActivityService.getAmbassadorActivities(ambassadorId, 100);
        setActivities(data);
      } catch (error) {
        console.error('Erreur lors du chargement des activités:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ambassadorId) {
      fetchActivities();
    }
  }, [ambassadorId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des activités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique des activités
          <Badge variant="secondary" className="ml-auto">
            {activities.length} activités
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune activité enregistrée</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.action_type)}`}>
                    {getActivityIcon(activity.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {activity.description}
                      </p>
                      <Badge variant="outline" className={getActivityColor(activity.action_type)}>
                        {activity.action_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(activity.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      {activity.user_id && (
                        <>
                          <span>•</span>
                          <User className="h-3 w-3" />
                          <span>Par utilisateur</span>
                        </>
                      )}
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-background rounded text-xs">
                        <pre className="text-muted-foreground">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};