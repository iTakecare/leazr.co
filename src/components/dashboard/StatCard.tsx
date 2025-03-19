
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
        "overflow-hidden transition-all hover:shadow-md rounded-xl card-gradient border-0", 
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          trend === 'up' ? "bg-emerald-100 text-emerald-600" : 
          trend === 'down' ? "bg-rose-100 text-rose-600" : 
          "bg-primary/10 text-primary"
        )}>
          <Icon className="h-4 w-4" />
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
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : 
            trend === 'down' ? "bg-rose-50 text-rose-600" : 
            "bg-gray-50 text-gray-600"
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
