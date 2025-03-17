
import { useState, useEffect } from 'react';
import { Leaser } from '@/types/leaser';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useLeasers() {
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeasers();
  }, []);

  const fetchLeasers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Real database query
      const { data, error } = await supabase
        .from('leasers')
        .select('*');
      
      if (error) throw error;
      
      setLeasers(data || []);
    } catch (err) {
      console.error('Error fetching leasers:', err);
      setError('Failed to load leasers');
      toast.error("Erreur lors du chargement des partenaires financiers");
    } finally {
      setIsLoading(false);
    }
  };

  return { leasers, isLoading, error, fetchLeasers };
}
