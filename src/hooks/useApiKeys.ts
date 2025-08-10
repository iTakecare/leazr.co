import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMultiTenant } from './useMultiTenant';

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  permissions: any;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { companyId } = useMultiTenant();

  useEffect(() => {
    if (user && companyId) {
      fetchApiKeys();
    }
  }, [user, companyId]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching API keys:', error);
        return;
      }

      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (name: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // First, run diagnostic to check authentication context
      console.log('🔬 API Key Diagnostic - Running authentication check...');
      
      const { data: diagnosticData, error: diagnosticError } = await supabase
        .rpc('diagnose_api_key_context');
      
      console.log('🔬 API Key Diagnostic - Auth context:', {
        diagnostic: diagnosticData?.[0],
        diagnosticError: diagnosticError?.message
      });

      // Try to create API key with enhanced debug function
      const { data, error } = await supabase
        .rpc('create_api_key_secure_debug', {
          p_name: name,
          p_permissions: {
            products: true,
            categories: true,
            brands: true,
            packs: true,
            environmental: true,
            images: true,
            attributes: true,
            specifications: true
          }
        });

      console.log('🔬 API Key Creation - Result:', {
        success: !!data,
        error: error?.message,
        debugInfo: data?.[0]?.debug_info
      });

      if (error) {
        console.error('❌ API Key creation failed:', error);
        throw error;
      }

      // Refresh the list
      await fetchApiKeys();
      return data?.[0]; // RPC returns an array, get the first item
    } catch (error) {
      console.error('❌ Critical API Key creation error:', error);
      throw error;
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) {
        console.error('Error deleting API key:', error);
        throw error;
      }

      // Refresh the list
      await fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  };

  const updateApiKey = async (keyId: string, updates: Partial<ApiKey>) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', keyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating API key:', error);
        throw error;
      }

      // Refresh the list
      await fetchApiKeys();
      return data;
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  };

  return {
    apiKeys,
    loading,
    createApiKey,
    deleteApiKey,
    updateApiKey,
    refetch: fetchApiKeys
  };
}
