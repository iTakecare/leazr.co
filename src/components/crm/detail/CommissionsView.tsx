
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

  useEffect(() => {
    if (isOpen && owner && owner.id) {
      fetchCommissionsTotal();
    }
  }, [isOpen, owner]);

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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle>
            Commissions - {owner.name}
          </SheetTitle>
          <SheetDescription>
            Total des commissions: {formatCurrency(totalCommissions)}
          </SheetDescription>
        </SheetHeader>
        
        <div className="overflow-auto flex-grow">
          {owner.type === 'partner' ? (
            <PartnerCommissionsTable partnerId={owner.id} />
          ) : (
            <AmbassadorCommissionsTable ambassadorId={owner.id} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommissionsView;
