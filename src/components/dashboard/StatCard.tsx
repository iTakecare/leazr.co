
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  change,
  trend = 'neutral',
  className
}: StatCardProps) => {
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg rounded-xl border-0", 
        trend === 'up' ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10" : 
        trend === 'down' ? "bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10" : 
        "bg-gradient-to-br from-blue-50 to-indigo-100/30 dark:from-blue-900/20 dark:to-indigo-800/10",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-red-500">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          trend === 'up' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : 
          trend === 'down' ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30" : 
          "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {change && (
          <p className={cn(
            "text-xs mt-2 py-1 px-2 rounded-full inline-block",
            trend === 'up' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : 
            trend === 'down' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" : 
            "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
