import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Users, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticResult {
  userEmail: string;
  userId: string;
  currentCompanyId: string | null;
  currentCompanyName: string | null;
  isCorrectCompany: boolean;
  ambassadorsVisible: number;
  clientsVisible: number;
  shouldCreateNewCompany: boolean;
}

export const DataIsolationDiagnostic = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const runDiagnostic = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 DIAGNOSTIC - Début du diagnostic pour:', user.email);
      
      // 1. Récupérer les informations du profil utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      console.log('🔍 DIAGNOSTIC - Profil:', profile);
      
      // 2. Récupérer les informations de l'entreprise
      let companyName = null;
      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();
        companyName = company?.name;
      }
      
      console.log('🔍 DIAGNOSTIC - Entreprise:', companyName);
      
      // 3. Compter les ambassadeurs visibles
      const { count: ambassadorsCount } = await supabase
        .from('ambassadors')
        .select('*', { count: 'exact', head: true });
      
      console.log('🔍 DIAGNOSTIC - Ambassadeurs visibles:', ambassadorsCount);
      
      // 4. Compter les clients visibles
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      console.log('🔍 DIAGNOSTIC - Clients visibles:', clientsCount);
      
      // 5. Vérifier si l'utilisateur est assigné à iTakecare
      const isAssignedToiTakecare = companyName === 'iTakecare';
      const shouldCreateNewCompany = isAssignedToiTakecare && ambassadorsCount! > 0;
      
      const result: DiagnosticResult = {
        userEmail: user.email || 'Unknown',
        userId: user.id,
        currentCompanyId: profile?.company_id || null,
        currentCompanyName: companyName,
        isCorrectCompany: !isAssignedToiTakecare,
        ambassadorsVisible: ambassadorsCount || 0,
        clientsVisible: clientsCount || 0,
        shouldCreateNewCompany
      };
      
      console.log('🔍 DIAGNOSTIC - Résultat:', result);
      setDiagnostic(result);
      
    } catch (error) {
      console.error('🔍 DIAGNOSTIC - Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exécuter le diagnostic",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fixIsolation = async () => {
    if (!diagnostic || !user) return;
    
    setIsFixing(true);
    try {
      console.log('🔧 FIX - Début de la correction pour:', user.email);
      
      // 1. Créer une nouvelle entreprise pour l'utilisateur
      const companyName = `${user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '')} Company` || 'New Company';
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          plan: 'starter',
          account_status: 'trial',
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        })
        .select()
        .single();
      
      if (companyError) throw companyError;
      console.log('🔧 FIX - Nouvelle entreprise créée:', newCompany);
      
      // 2. Mettre à jour le profil utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          company_id: newCompany.id,
          role: 'admin' // S'assurer que l'utilisateur est admin de sa propre entreprise
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      console.log('🔧 FIX - Profil utilisateur mis à jour');
      
      // 3. Initialiser l'entreprise avec les données par défaut
      const { error: initError } = await supabase.rpc('initialize_new_company', {
        p_company_id: newCompany.id,
        p_company_name: companyName
      });
      
      if (initError) {
        console.warn('🔧 FIX - Avertissement lors de l\'initialisation:', initError);
      }
      
      toast({
        title: "✅ Isolation corrigée",
        description: `Nouvelle entreprise "${companyName}" créée avec succès`,
      });
      
      // Recharger la page pour appliquer les changements
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('🔧 FIX - Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de corriger l'isolation des données",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Diagnostic d'isolation des données
          </CardTitle>
          <CardDescription>
            Vous devez être connecté pour utiliser ce diagnostic
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Diagnostic d'isolation des données
        </CardTitle>
        <CardDescription>
          Vérifiez et corrigez l'isolation des données entre entreprises
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} disabled={isLoading}>
          {isLoading ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
        </Button>
        
        {diagnostic && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Informations utilisateur</h4>
                <p className="text-sm text-muted-foreground">Email: {diagnostic.userEmail}</p>
                <p className="text-sm text-muted-foreground">ID: {diagnostic.userId}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Entreprise actuelle</h4>
                <p className="text-sm text-muted-foreground">
                  Nom: {diagnostic.currentCompanyName || 'Aucune'}
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {diagnostic.currentCompanyId || 'Aucun'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Ambassadeurs visibles: {diagnostic.ambassadorsVisible}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Clients visibles: {diagnostic.clientsVisible}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {diagnostic.isCorrectCompany ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Isolation correcte
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Problème d'isolation détecté
                </Badge>
              )}
            </div>
            
            {diagnostic.shouldCreateNewCompany && (
              <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">
                  Action recommandée
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  Vous êtes actuellement assigné à l'entreprise "iTakecare" ce qui vous donne accès aux données d'autres entreprises. 
                  Il est recommandé de créer votre propre entreprise pour une isolation correcte des données.
                </p>
                <Button 
                  onClick={fixIsolation} 
                  disabled={isFixing}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {isFixing ? 'Correction en cours...' : 'Créer ma propre entreprise'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};