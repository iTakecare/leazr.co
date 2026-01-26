import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, FileText, Target, Clock, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommercialStats } from '@/services/commercialDashboardService';

interface CommercialStatsCardProps {
  stats: CommercialStats | null;
  isLoading: boolean;
  period: 'week' | 'month';
}

const StatItem = ({ 
  label, 
  value, 
  change, 
  icon: Icon,
  suffix = '',
  invertColors = false
}: { 
  label: string; 
  value: number | string; 
  change?: number;
  icon: React.ElementType;
  suffix?: string;
  invertColors?: boolean;
}) => {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  
  // Pour certaines métriques (comme le délai), une baisse est positive
  const showGreen = invertColors ? isNegative : isPositive;
  const showRed = invertColors ? isPositive : isNegative;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/50">
      <div className="p-2 rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{value}{suffix}</span>
          {change !== undefined && change !== 0 && (
            <span className={cn(
              "text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded",
              showGreen && "text-emerald-700 bg-emerald-100",
              showRed && "text-rose-700 bg-rose-100",
              !showGreen && !showRed && "text-slate-600 bg-slate-100"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommercialStatsCard = ({ stats, isLoading, period }: CommercialStatsCardProps) => {
  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-500" />
            Statistiques Commerciales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const periodLabel = period === 'week' ? 'cette semaine' : 'ce mois';

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-500" />
          Statistiques Commerciales
          <span className="text-xs text-muted-foreground font-normal">({periodLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <StatItem
            label="Nouvelles demandes"
            value={stats?.newOffersCount || 0}
            change={stats?.newOffersChange}
            icon={FileText}
          />
          <StatItem
            label="Taux de conversion"
            value={stats?.conversionRate || 0}
            suffix="%"
            change={stats?.conversionRateChange}
            icon={TrendingUp}
          />
          <StatItem
            label="Délai moyen"
            value={stats?.avgProcessingDays || 0}
            suffix=" j"
            change={stats?.avgProcessingDaysChange}
            icon={Clock}
            invertColors
          />
          <StatItem
            label="En cours"
            value={stats?.pendingOffersCount || 0}
            icon={FolderOpen}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CommercialStatsCard;
