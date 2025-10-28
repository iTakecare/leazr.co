import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Broker } from '@/types/broker';

export const useBrokerSlugAccess = () => {
  const { brokerSlug } = useParams<{ brokerSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !brokerSlug) {
        setLoading(false);
        setHasAccess(false);
        return;
      }

      try {
        // Récupérer le broker par slug
        const { data: brokerData, error: brokerError } = await supabase
          .rpc('get_broker_by_slug', { broker_slug: brokerSlug });

        if (brokerError || !brokerData || brokerData.length === 0) {
          console.error('Broker not found or error:', brokerError);
          setHasAccess(false);
          navigate('/');
          return;
        }

        const brokerInfo = brokerData[0];

        // Vérifier que l'utilisateur appartient à ce broker
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id === brokerInfo.id) {
          setBroker(brokerInfo as Broker);
          setHasAccess(true);
        } else {
          setHasAccess(false);
          navigate('/');
        }
      } catch (err) {
        console.error('Error checking broker access:', err);
        setHasAccess(false);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, brokerSlug, navigate]);

  return { broker, loading, hasAccess };
};
