import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FileText, FileCheck, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ActivityItem } from '@/services/commercialDashboardService';
import { Link, useLocation } from 'react-router-dom';

interface RecentActivityCardProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

const getStatusColor = (status?: string): string => {
  if (!status) return 'bg-slate-100 text-slate-600';
  
  const colors: Record<string, string> = {
    'accepted': 'bg-emerald-100 text-emerald-700',
    'leaser_approved': 'bg-emerald-100 text-emerald-700',
    'active': 'bg-emerald-100 text-emerald-700',
    'refused': 'bg-rose-100 text-rose-700',
    'leaser_rejected': 'bg-rose-100 text-rose-700',
    'cancelled': 'bg-rose-100 text-rose-700',
    'draft': 'bg-slate-100 text-slate-600',
    'pending': 'bg-amber-100 text-amber-700',
    'leaser_pending': 'bg-amber-100 text-amber-700',
    'sent_to_client': 'bg-blue-100 text-blue-700',
    'client_validated': 'bg-cyan-100 text-cyan-700'
  };
  
  return colors[status] || 'bg-slate-100 text-slate-600';
};

export const RecentActivityCard = ({ activities, isLoading }: RecentActivityCardProps) => {
  const location = useLocation();
  const companySlug = location.pathname.split('/')[1];

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-cyan-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            Activité Récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-lg" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-slate-100 animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-cyan-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          Activité Récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune activité récente
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                to={`/${companySlug}${activity.link}`}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  activity.type === 'offer' ? 'bg-blue-100' : 'bg-emerald-100'
                )}>
                  {activity.type === 'offer' 
                    ? <FileText className="h-3.5 w-3.5 text-blue-600" />
                    : <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {activity.action}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                      getStatusColor(activity.status)
                    )}>
                      {activity.type === 'offer' ? 'Demande' : 'Contrat'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.client_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(activity.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
