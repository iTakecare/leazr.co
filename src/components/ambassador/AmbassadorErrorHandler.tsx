
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AmbassadorErrorHandlerProps {
  message: string;
  onRetry?: () => void;
  showDiagnosticInfo?: boolean;
}

const AmbassadorErrorHandler = ({ message, onRetry, showDiagnosticInfo = false }: AmbassadorErrorHandlerProps) => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Vérifier que l'utilisateur est bien authentifié
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error:", authError);
        setDiagnosticInfo({
          isAuthenticated: false,
          authError: authError.message,
          userId: null,
          userEmail: null,
          hasAmbassadorProfile: false,
          ambassadorId: null,
          rlsAccess: false
        });
        toast.error("Erreur d'authentification détectée");
        return;
      }
      
      if (!authData?.user) {
        setDiagnosticInfo({
          isAuthenticated: false,
          userId: null,
          userEmail: null,
          hasAmbassadorProfile: false,
          ambassadorId: null,
          rlsAccess: false
        });
        toast.error("Vous n'êtes pas connecté. Veuillez vous reconnecter.");
        return;
      }
      
      // Vérifier si l'utilisateur a un profil d'ambassadeur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, name, email')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      
      // Vérifier les politiques RLS en testant l'accès aux ambassador_clients
      const { data: rlsTestData, error: rlsError } = await supabase
        .from('ambassador_clients')
        .select('*')
        .limit(1);
      
      setDiagnosticInfo({
        isAuthenticated: !!authData.user,
        userId: authData.user?.id,
        userEmail: authData.user?.email,
        hasAmbassadorProfile: !!ambassadorData,
        ambassadorId: ambassadorData?.id,
        ambassadorName: ambassadorData?.name,
        ambassadorEmail: ambassadorData?.email,
        rlsAccess: !rlsError,
        rlsError: rlsError ? rlsError.message : null,
        testDataCount: rlsTestData?.length || 0
      });
      
      if (!ambassadorData) {
        toast.error("Nous n'avons pas trouvé votre profil ambassadeur. Veuillez contacter l'administrateur.");
      } else if (rlsError) {
        toast.error("Problème d'accès à la base de données. Vos permissions sont peut-être insuffisantes.");
      } else {
        toast.success("Diagnostic terminé. Vous pouvez essayer à nouveau.");
      }
    } catch (error) {
      console.error("Erreur lors du diagnostic:", error);
      setDiagnosticInfo({
        isAuthenticated: false,
        error: error.message,
        rlsAccess: false
      });
      toast.error("Erreur lors du diagnostic");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-medium mb-2">
          Erreur
        </AlertTitle>
        <AlertDescription className="text-sm">
          {message}
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        )}
        
        {showDiagnosticInfo && (
          <Button 
            onClick={runDiagnostics}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <HelpCircle className="h-4 w-4" />
            {isLoading ? "Diagnostic en cours..." : "Exécuter un diagnostic"}
          </Button>
        )}
      </div>
      
      {diagnosticInfo && (
        <div className="mt-6 p-4 bg-muted rounded-md text-xs space-y-2">
          <h3 className="font-medium text-sm">Informations de diagnostic</h3>
          <p>Authentifié: {diagnosticInfo.isAuthenticated ? "Oui" : "Non"}</p>
          <p>ID Utilisateur: {diagnosticInfo.userId || "Non disponible"}</p>
          <p>Email: {diagnosticInfo.userEmail || "Non disponible"}</p>
          <p>Profil ambassadeur: {diagnosticInfo.hasAmbassadorProfile ? "Trouvé" : "Non trouvé"}</p>
          <p>ID Ambassadeur: {diagnosticInfo.ambassadorId || "Non disponible"}</p>
          {diagnosticInfo.ambassadorName && (
            <p>Nom Ambassadeur: {diagnosticInfo.ambassadorName}</p>
          )}
          {diagnosticInfo.ambassadorEmail && (
            <p>Email Ambassadeur: {diagnosticInfo.ambassadorEmail}</p>
          )}
          <p>Accès base de données: {diagnosticInfo.rlsAccess ? "OK" : "Problème"}</p>
          
          {diagnosticInfo.rlsError && (
            <div className="p-2 bg-destructive/10 rounded text-destructive">
              <p>Erreur: {diagnosticInfo.rlsError}</p>
            </div>
          )}
          
          {diagnosticInfo.authError && (
            <div className="p-2 bg-destructive/10 rounded text-destructive">
              <p>Erreur d'authentification: {diagnosticInfo.authError}</p>
            </div>
          )}
          
          {diagnosticInfo.error && (
            <div className="p-2 bg-destructive/10 rounded text-destructive">
              <p>Erreur générale: {diagnosticInfo.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AmbassadorErrorHandler;
