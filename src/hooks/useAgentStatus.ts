import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface AgentStatus {
  id?: string;
  agent_id: string;
  company_id: string;
  is_online: boolean;
  is_available: boolean;
  current_conversations: number;
  max_conversations: number;
  last_seen_at: string;
}

interface CompanyAvailability {
  is_available: boolean;
  agent_count: number;
  next_available_time?: string;
}

export const useAgentStatus = () => {
  const { user } = useAuth();
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [companyAvailability, setCompanyAvailability] = useState<CompanyAvailability>({
    is_available: false,
    agent_count: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user's company ID
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
      }
    };

    fetchCompanyId();
  }, [user?.id]);

  // Load agent status
  const loadAgentStatus = useCallback(async () => {
    if (!user?.id || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('chat_agent_status')
        .select('*')
        .eq('agent_id', user.id)
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAgentStatus(data);
      } else {
        // Create default status
        const newStatus = {
          agent_id: user.id,
          company_id: companyId,
          is_online: false,
          is_available: false,
          current_conversations: 0,
          max_conversations: 5,
          last_seen_at: new Date().toISOString()
        };

        const { data: created, error: createError } = await supabase
          .from('chat_agent_status')
          .insert(newStatus)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setAgentStatus(created);
      }
    } catch (error) {
      console.error('Error loading agent status:', error);
      setError('Erreur lors du chargement du statut');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, companyId]);

  // Check company availability
  const checkCompanyAvailability = useCallback(async (targetCompanyId?: string) => {
    const checkId = targetCompanyId || companyId;
    if (!checkId) return;

    try {
      // Use the database function to check availability
      const { data, error } = await supabase.rpc('is_company_chat_available', {
        p_company_id: checkId
      });

      if (error) {
        throw error;
      }

      // Get agent count
      const { count } = await supabase
        .from('chat_agent_status')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', checkId)
        .eq('is_online', true)
        .eq('is_available', true);

      setCompanyAvailability({
        is_available: data || false,
        agent_count: count || 0
      });
    } catch (error) {
      console.error('Error checking company availability:', error);
    }
  }, [companyId]);

  // Toggle online status
  const toggleOnlineStatus = useCallback(async () => {
    if (!agentStatus || !user?.id) return;

    try {
      const newStatus = !agentStatus.is_online;
      
      const { error } = await supabase
        .from('chat_agent_status')
        .update({
          is_online: newStatus,
          is_available: newStatus, // Automatiquement disponible quand en ligne
          last_seen_at: new Date().toISOString()
        })
        .eq('id', agentStatus.id);

      if (error) {
        throw error;
      }

      setAgentStatus(prev => prev ? {
        ...prev,
        is_online: newStatus,
        is_available: newStatus, // Automatiquement disponible quand en ligne
        last_seen_at: new Date().toISOString()
      } : null);

      // Refresh company availability
      await checkCompanyAvailability();
    } catch (error) {
      console.error('Error toggling online status:', error);
      setError('Erreur lors de la mise à jour du statut');
    }
  }, [agentStatus, user?.id, checkCompanyAvailability]);

  // Toggle availability (when online)
  const toggleAvailability = useCallback(async () => {
    if (!agentStatus || !user?.id || !agentStatus.is_online) return;

    try {
      const newAvailability = !agentStatus.is_available;
      
      const { error } = await supabase
        .from('chat_agent_status')
        .update({
          is_available: newAvailability,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', agentStatus.id);

      if (error) {
        throw error;
      }

      setAgentStatus(prev => prev ? {
        ...prev,
        is_available: newAvailability,
        last_seen_at: new Date().toISOString()
      } : null);

      // Refresh company availability
      await checkCompanyAvailability();
    } catch (error) {
      console.error('Error toggling availability:', error);
      setError('Erreur lors de la mise à jour de la disponibilité');
    }
  }, [agentStatus, user?.id, checkCompanyAvailability]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!companyId) return;

    loadAgentStatus();
    checkCompanyAvailability();

    // Subscribe to agent status changes for the company
    const statusChannel = supabase
      .channel(`agent_status_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_agent_status',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          checkCompanyAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [companyId, loadAgentStatus, checkCompanyAvailability]);

  return {
    agentStatus,
    companyAvailability,
    isLoading,
    error,
    toggleOnlineStatus,
    toggleAvailability,
    checkCompanyAvailability,
    refetch: loadAgentStatus
  };
};