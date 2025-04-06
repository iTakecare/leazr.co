
import React, { useState, useEffect } from 'react';
import PartnerCommissionsTable from '@/components/partners/PartnerCommissionsTable';
import AmbassadorCommissionsTable from '@/components/ambassadors/AmbassadorCommissionsTable';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommissionsViewProps {
  isOpen: boolean;
  onClose: () => void;
  owner: {
    id: string;
    name: string;
    type: 'partner' | 'ambassador';
  };
  commissions?: any[]; // Ajout du prop optionnel commissions
}

const CommissionsView: React.FC<CommissionsViewProps> = ({ isOpen, onClose, owner, commissions }) => {
  const [totalCommissions, setTotalCommissions] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    if (isOpen && owner && owner.id) {
      fetchCommissionsTotal();
    }
  }, [isOpen, owner, refreshTrigger]);

  const fetchCommissionsTotal = async () => {
    try {
      setLoading(true);
      
      // Table name based on owner type
      const tableName = owner.type === 'partner' ? 'partners' : 'ambassadors';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('commissions_total')
        .eq('id', owner.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      setTotalCommissions(data?.commissions_total || 0);
    } catch (error) {
      console.error(`Error fetching ${owner.type} commissions total:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex justify-between items-center">
            <span>Commissions - {owner.name}</span>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="h-8 px-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </SheetTitle>
          <SheetDescription className="flex items-center">
            Total des commissions: 
            {loading ? (
              <div className="ml-2 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                <span>Chargement...</span>
              </div>
            ) : (
              <span className="ml-2 font-semibold text-green-600">{formatCurrency(totalCommissions)}</span>
            )}
          </SheetDescription>
        </SheetHeader>
        
        <div className="overflow-auto flex-grow mt-4">
          {owner.type === 'partner' ? (
            <PartnerCommissionsTable partnerId={owner.id} refreshTrigger={refreshTrigger} />
          ) : (
            <AmbassadorCommissionsTable ambassadorId={owner.id} refreshTrigger={refreshTrigger} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommissionsView;
