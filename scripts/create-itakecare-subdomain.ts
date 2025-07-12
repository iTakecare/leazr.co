import { supabase } from '@/integrations/supabase/client';

// Script pour créer le sous-domaine itakecare.leazr.co
const createItakecareSubdomain = async () => {
  try {
    console.log('🚀 Création du sous-domaine itakecare.leazr.co...');
    
    const { data, error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
      body: {
        companyId: 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
        companyName: 'iTakecare',
        subdomain: 'itakecare'
      }
    });

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    console.log('✅ Sous-domaine créé avec succès:', data);
    
    // Vérifier dans la base de données
    const { data: domainData } = await supabase
      .from('company_domains')
      .select('*')
      .eq('company_id', 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0')
      .eq('subdomain', 'itakecare');
      
    console.log('📋 Données dans company_domains:', domainData);
    
  } catch (error) {
    console.error('💥 Erreur lors de la création:', error);
  }
};

// Exécuter immédiatement
createItakecareSubdomain();