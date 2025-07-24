import { supabase } from "@/integrations/supabase/client";

export interface CrawlResult {
  success: boolean;
  products?: any[];
  totalFound?: number;
  error?: string;
  rawData?: string;
}

export class FirecrawlService {
  static async analyzeCatalog(): Promise<CrawlResult> {
    try {
      console.log('Starting iTakecare catalog analysis...');
      
      const { data, error } = await supabase.functions.invoke('analyze-itakecare-catalog', {
        body: {}
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          error: error.message || 'Erreur lors de l\'analyse du catalogue'
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Erreur inconnue lors de l\'analyse'
        };
      }

      console.log(`Catalog analysis successful: ${data.totalFound} products found`);
      
      return {
        success: true,
        products: data.products,
        totalFound: data.totalFound,
        rawData: data.rawData
      };
    } catch (error) {
      console.error('Error in FirecrawlService:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse du catalogue'
      };
    }
  }
}