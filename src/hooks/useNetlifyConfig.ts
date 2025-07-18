
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NetlifyConfig {
  api_token?: string;
  team_slug?: string;
  default_build_command?: string;
  default_publish_directory?: string;
  default_environment_variables?: Record<string, string>;
  auto_deploy?: boolean;
  is_enabled?: boolean;
}

export const useNetlifyConfig = () => {
  const [config, setConfig] = useState<NetlifyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      console.log("🔄 Chargement de la configuration Netlify...");
      
      const { data, error } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('integration_type', 'netlify')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        console.log("✅ Configuration Netlify trouvée:", {
          hasApiCredentials: !!data.api_credentials,
          isEnabled: data.is_enabled,
          settings: data.settings
        });
        
        setConfig({
          api_token: data.api_credentials?.api_token,
          team_slug: data.settings?.team_slug,
          default_build_command: data.settings?.default_build_command || 'npm run build',
          default_publish_directory: data.settings?.default_publish_directory || 'dist',
          default_environment_variables: data.settings?.default_environment_variables || {},
          auto_deploy: data.settings?.auto_deploy !== false,
          is_enabled: data.is_enabled
        });
      } else {
        console.log("⚠️ Aucune configuration Netlify trouvée, configuration par défaut");
        // No configuration found, set defaults
        setConfig({
          default_build_command: 'npm run build',
          default_publish_directory: 'dist',
          default_environment_variables: {},
          auto_deploy: true,
          is_enabled: false
        });
      }
      setError(null);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement de la configuration Netlify:', err);
      setError(err.message);
      toast.error("Erreur lors du chargement de la configuration Netlify");
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = () => {
    const configured = !!(config?.api_token && config?.is_enabled);
    console.log("🔍 Vérification configuration Netlify:", {
      hasApiToken: !!config?.api_token,
      isEnabled: config?.is_enabled,
      isConfigured: configured
    });
    return configured;
  };

  const getDeploymentConfig = () => {
    if (!isConfigured()) {
      const error = "Configuration Netlify incomplète. Veuillez configurer Netlify dans les paramètres.";
      console.error("❌", error);
      throw new Error(error);
    }
    console.log("✅ Configuration de déploiement récupérée");
    return config;
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    isConfigured,
    getDeploymentConfig,
    reload: loadConfig
  };
};
