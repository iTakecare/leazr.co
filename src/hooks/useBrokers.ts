import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Broker } from '@/types/broker';

export const useBrokers = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('company_type', 'broker')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrokers(data as Broker[]);
    } catch (err) {
      console.error('Error fetching brokers:', err);
      setBrokers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  return { brokers, loading, refresh: fetchBrokers };
};
