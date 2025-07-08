/**
 * Service de gestion de l'isolation des données entre entreprises
 * Garantit qu'aucune donnée d'iTakecare ne fuite vers les autres entreprises
 */

import { supabase } from '@/integrations/supabase/client';

export interface IsolationReport {
  success: boolean;
  issues: string[];
  corrected: string[];
  warnings: string[];
}

/**
 * Vérifie et corrige l'isolation des données pour un utilisateur
 */
export const ensureUserDataIsolation = async (userId: string): Promise<IsolationReport> => {
  const report: IsolationReport = {
    success: true,
    issues: [],
    corrected: [],
    warnings: []
  };

  try {
    // 1. Vérifier l'utilisateur et son email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      report.success = false;
      report.issues.push("Impossible de récupérer les données utilisateur");
      return report;
    }

    const isITakecareUser = user.email?.includes('itakecare.be') || false;
    
    // 2. Vérifier l'assignation d'entreprise
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        company_id,
        companies!inner(
          id,
          name,
          account_status
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      report.success = false;
      report.issues.push(`Erreur lors de la récupération du profil: ${profileError.message}`);
      return report;
    }

    // 3. Vérifier l'assignation correcte
    const companyName = profile.companies?.name;
    const isAssignedToITakecare = companyName === 'iTakecare';

    if (isITakecareUser && !isAssignedToITakecare) {
      report.warnings.push("Utilisateur iTakecare non assigné à l'entreprise iTakecare");
    } else if (!isITakecareUser && isAssignedToITakecare) {
      report.issues.push("Utilisateur non-iTakecare assigné incorrectement à iTakecare");
      
      // Correction automatique : créer une nouvelle entreprise
      await createCleanCompanyForUser(user, report);
    }

    // 4. Vérifier l'isolation des données dans les tables liées
    await checkDataIsolation(userId, profile.company_id, report);

    report.success = report.issues.length === 0;
    
  } catch (error) {
    report.success = false;
    report.issues.push(`Erreur inattendue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }

  return report;
};

/**
 * Crée une entreprise propre pour un utilisateur mal assigné
 */
const createCleanCompanyForUser = async (user: any, report: IsolationReport) => {
  try {
    // Extraire le nom de l'email pour créer un nom d'entreprise
    const emailPrefix = user.email?.split('@')[0] || 'Demo';
    const companyName = `Entreprise ${emailPrefix}`;

    // Créer la nouvelle entreprise
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        plan: 'starter',
        account_status: 'trial',
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 jours
        modules_enabled: ['calculator', 'catalog', 'crm'] // Modules de base
      })
      .select()
      .single();

    if (companyError) {
      report.issues.push(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
      return;
    }

    // Réassigner l'utilisateur
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: newCompany.id })
      .eq('id', user.id);

    if (updateError) {
      report.issues.push(`Erreur lors de la réassignation: ${updateError.message}`);
    } else {
      report.corrected.push(`Nouvelle entreprise créée: ${companyName}`);
      report.corrected.push(`Utilisateur réassigné à l'entreprise ${newCompany.id}`);
    }

  } catch (error) {
    report.issues.push(`Erreur lors de la création d'entreprise: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

/**
 * Vérifie l'isolation des données dans les tables liées
 */
const checkDataIsolation = async (userId: string, companyId: string, report: IsolationReport) => {
  try {
    // Vérifier les clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, company_id')
      .eq('user_id', userId);

    if (clientsError) {
      report.warnings.push(`Impossible de vérifier les clients: ${clientsError.message}`);
    } else if (clients) {
      const wrongClients = clients.filter(c => c.company_id !== companyId);
      if (wrongClients.length > 0) {
        report.issues.push(`${wrongClients.length} clients assignés à une mauvaise entreprise`);
        
        // Corriger automatiquement
        const { error: correctError } = await supabase
          .from('clients')
          .update({ company_id: companyId })
          .in('id', wrongClients.map(c => c.id));

        if (correctError) {
          report.issues.push(`Erreur lors de la correction des clients: ${correctError.message}`);
        } else {
          report.corrected.push(`${wrongClients.length} clients réassignés correctement`);
        }
      }
    }

    // Vérifier les offres
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, client_name, company_id')
      .eq('user_id', userId);

    if (offersError) {
      report.warnings.push(`Impossible de vérifier les offres: ${offersError.message}`);
    } else if (offers) {
      const wrongOffers = offers.filter(o => o.company_id !== companyId);
      if (wrongOffers.length > 0) {
        report.issues.push(`${wrongOffers.length} offres assignées à une mauvaise entreprise`);
        
        // Corriger automatiquement
        const { error: correctError } = await supabase
          .from('offers')
          .update({ company_id: companyId })
          .in('id', wrongOffers.map(o => o.id));

        if (correctError) {
          report.issues.push(`Erreur lors de la correction des offres: ${correctError.message}`);
        } else {
          report.corrected.push(`${wrongOffers.length} offres réassignées correctement`);
        }
      }
    }

  } catch (error) {
    report.warnings.push(`Erreur lors de la vérification des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

/**
 * Nettoie toutes les données d'un utilisateur pour s'assurer qu'elles sont isolées
 */
export const cleanUserData = async (): Promise<IsolationReport> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return {
      success: false,
      issues: ["Utilisateur non authentifié"],
      corrected: [],
      warnings: []
    };
  }

  return await ensureUserDataIsolation(user.id);
};

/**
 * Vérifie si l'utilisateur actuel a une isolation correcte des données
 */
export const checkCurrentUserIsolation = async (): Promise<boolean> => {
  const report = await cleanUserData();
  return report.success && report.issues.length === 0;
};