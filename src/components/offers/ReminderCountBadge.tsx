import React from "react";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReminderCountBadgeProps {
  offerId: string;
  className?: string;
  showZero?: boolean;
}

const ReminderCountBadge: React.FC<ReminderCountBadgeProps> = ({ 
  offerId, 
  className = "",
  showZero = false 
}) => {
  const { data: count = 0 } = useQuery({
    queryKey: ['reminder-count', offerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('offer_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('offer_id', offerId)
        .not('sent_at', 'is', null);
      
      if (error) {
        console.error("Error fetching reminder count:", error);
        return 0;
      }
      
      return count || 0;
    },
    staleTime: 30000, // 30 seconds
  });

  if (count === 0 && !showZero) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className={`bg-blue-50 text-blue-700 border-blue-200 ${className}`}
    >
      <Mail className="w-3 h-3 mr-1" />
      {count} relance{count > 1 ? 's' : ''}
    </Badge>
  );
};

export default ReminderCountBadge;
