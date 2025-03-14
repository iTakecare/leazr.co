
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
    <Card className={cn("overflow-hidden transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-4 w-4", 
          trend === 'up' ? "text-emerald-500" : 
          trend === 'down' ? "text-rose-500" : 
          "text-muted-foreground"
        )} />
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
            "text-xs mt-1",
            trend === 'up' ? "text-emerald-500" : 
            trend === 'down' ? "text-rose-500" : 
            "text-muted-foreground"
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
