import { supabase } from "@/integrations/supabase/client";

export interface CloudflareNetlifyConfig {
  companyId: string;
  subdomain: string;
  netlifyDomain: string;
  customDomain?: string;
}

export class CloudflareNetlifyService {
  
  /**
   * Configure automatiquement le DNS Cloudflare pour pointer vers Netlify
   */
  static async configureCloudflareForNetlify(config: CloudflareNetlifyConfig) {
    try {
      console.log('Configuring Cloudflare DNS for Netlify:', config);

      // 1. Créer ou mettre à jour l'enregistrement DNS dans Cloudflare
      const dnsRecord = {
        type: 'CNAME',
        name: config.subdomain,
        content: config.netlifyDomain,
        ttl: 300, // 5 minutes
        proxied: true // Activer le proxy Cloudflare pour CDN/SSL
      };

      // 2. Log de la configuration DNS
      await supabase
        .from('cloudflare_subdomain_logs')
        .insert({
          company_id: config.companyId,
          subdomain: config.subdomain,
          status: 'pending_netlify_integration',
          error_message: `Configuration DNS pour Netlify: ${config.netlifyDomain}`,
          retry_count: 0
        });

      return {
        success: true,
        dnsRecord,
        message: 'Configuration DNS Cloudflare programmée'
      };

    } catch (error: any) {
      console.error('Error configuring Cloudflare for Netlify:', error);
      
      // Log de l'erreur
      await supabase
        .from('cloudflare_subdomain_logs')
        .insert({
          company_id: config.companyId,
          subdomain: config.subdomain,
          status: 'failed',
          error_message: error.message,
          retry_count: 0
        });

      throw error;
    }
  }

  /**
   * Obtenir la configuration DNS recommandée pour Netlify
   */
  static getNetlifyDNSConfig(netlifyDomain: string, subdomain: string) {
    return {
      records: [
        {
          type: 'CNAME',
          name: subdomain,
          content: netlifyDomain,
          description: 'Redirection vers le site Netlify'
        }
      ],
      sslConfig: {
        enabled: true,
        mode: 'full', // SSL entre Cloudflare et Netlify
        description: 'SSL automatique via Cloudflare'
      },
      cacheConfig: {
        level: 'aggressive',
        description: 'Cache CDN pour performances optimales'
      }
    };
  }

  /**
   * Vérifier le statut de la configuration DNS
   */
  static async checkDNSStatus(companyId: string, subdomain: string) {
    try {
      const { data, error } = await supabase
        .from('cloudflare_subdomain_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('subdomain', subdomain)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      return data?.[0] || null;
    } catch (error) {
      console.error('Error checking DNS status:', error);
      return null;
    }
  }

  /**
   * Synchroniser les domaines entre Cloudflare et Netlify
   */
  static async syncDomainsWithNetlify(companyId: string) {
    try {
      // Récupérer les domaines de l'entreprise
      const { data: domains, error: domainsError } = await supabase
        .from('company_domains')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (domainsError) throw domainsError;

      // Récupérer les configurations Netlify
      const { data: netlifyConfigs, error: netlifyError } = await supabase
        .from('netlify_configurations')
        .select('*')
        .eq('company_id', companyId);

      if (netlifyError) throw netlifyError;

      const syncResults = [];

      for (const domain of domains || []) {
        for (const netlifyConfig of netlifyConfigs || []) {
          if (netlifyConfig.site_name) {
            const netlifyDomain = `${netlifyConfig.site_name}.netlify.app`;
            
            const syncResult = await this.configureCloudflareForNetlify({
              companyId,
              subdomain: domain.subdomain || '',
              netlifyDomain,
              customDomain: domain.domain
            });

            syncResults.push(syncResult);
          }
        }
      }

      return {
        success: true,
        results: syncResults,
        message: `Synchronisation de ${syncResults.length} domaines`
      };

    } catch (error: any) {
      console.error('Error syncing domains:', error);
      throw error;
    }
  }

  /**
   * Obtenir les recommandations d'architecture Cloudflare + Netlify
   */
  static getArchitectureRecommendations() {
    return {
      workflow: [
        {
          step: 1,
          title: "Développement",
          description: "Code poussé sur GitHub",
          tools: ["GitHub", "Git"]
        },
        {
          step: 2,
          title: "Build & Deploy",
          description: "Netlify détecte les changements et build automatiquement",
          tools: ["Netlify", "CI/CD"]
        },
        {
          step: 3,
          title: "DNS & CDN",
          description: "Cloudflare gère le DNS et accélère le contenu",
          tools: ["Cloudflare DNS", "Cloudflare CDN"]
        },
        {
          step: 4,
          title: "SSL & Sécurité",
          description: "SSL automatique et protection DDoS",
          tools: ["Cloudflare SSL", "Cloudflare Security"]
        }
      ],
      benefits: [
        "Déploiement automatique depuis GitHub",
        "CDN global pour performances optimales",
        "SSL automatique et gratuit",
        "Protection DDoS et sécurité avancée",
        "Gestion DNS centralisée",
        "Cache intelligent"
      ],
      bestPractices: [
        "Utiliser des sous-domaines pour chaque client",
        "Activer le cache Cloudflare pour les assets statiques",
        "Configurer les redirections au niveau DNS",
        "Monitorer les performances avec Cloudflare Analytics"
      ]
    };
  }
}

export default CloudflareNetlifyService;